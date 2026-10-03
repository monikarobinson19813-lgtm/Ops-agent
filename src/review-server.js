import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApproval, applyApprovalAction } from './domain/approval.js';
import { LocalJsonStore } from './storage/local-json-store.js';
import { auditEvent, AUDIT_TYPES } from './domain/audit.js';
import { buildCommandCenter } from './domain/command-center.js';
import { buildEntityDetail } from './domain/detail.js';
import {
  planOperatorAction,
  findEquivalentPendingApproval
} from './domain/operator-action.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const fixturePath=path.join(root,'fixtures','review-cases.json');
const commandCenterFixturePath=path.join(root,'fixtures','command-center-demo.json');
const publicDir=path.join(root,'public');
const store=new LocalJsonStore(path.join(root,'.data','review-state'));

const fixtures=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const commandCenterFixture=JSON.parse(fs.readFileSync(commandCenterFixturePath,'utf8'));

if(store.listApprovals().length===0){
  store.saveApprovals(fixtures.map(row=>({
    ...createApproval({
      approvalId:row.approvalId,
      caseId:row.caseId,
      kind:row.kind,
      proposedText:row.proposedText,
      metadata:row
    }),
    ...row
  })));
}

function json(res,code,body){
  const payload=JSON.stringify(body,null,2);
  res.writeHead(code,{'content-type':'application/json; charset=utf-8'});
  res.end(payload);
}

async function body(req){
  let text='';
  for await(const chunk of req)text+=chunk;
  return text?JSON.parse(text):{};
}

function serve(res,file,type){
  res.writeHead(200,{'content-type':type});
  res.end(fs.readFileSync(file));
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');

  if(req.method==='GET' && url.pathname==='/'){
    return serve(res,path.join(publicDir,'command-center.html'),'text/html; charset=utf-8');
  }

  if(req.method==='GET' && url.pathname==='/command-center.js'){
    return serve(res,path.join(publicDir,'command-center.js'),'text/javascript; charset=utf-8');
  }

  if(req.method==='GET' && url.pathname==='/review'){
    return serve(res,path.join(publicDir,'review.html'),'text/html; charset=utf-8');
  }

  if(req.method==='GET' && url.pathname==='/detail'){
    return serve(res,path.join(publicDir,'detail.html'),'text/html; charset=utf-8');
  }

  if(req.method==='GET' && url.pathname==='/detail.js'){
    return serve(res,path.join(publicDir,'detail.js'),'text/javascript; charset=utf-8');
  }

  if(req.method==='GET' && url.pathname==='/app.js'){
    return serve(res,path.join(publicDir,'app.js'),'text/javascript; charset=utf-8');
  }

  if(req.method==='GET' && url.pathname==='/api/command-center'){
    const approvals=store.listApprovals();
    const model=buildCommandCenter({
      cases:commandCenterFixture.cases || [],
      incidents:commandCenterFixture.incidents || [],
      approvals,
      now:new Date()
    });
    return json(res,200,{
      ...model,
      sendMode:'SHADOW_ONLY',
      dataMode:'DEMO'
    });
  }

  if(req.method==='GET' && url.pathname==='/api/detail'){
    const type=String(url.searchParams.get('type') || '').toUpperCase();
    const id=String(url.searchParams.get('id') || '');
    const approvals=store.listApprovals();
    const audit=[
      ...(commandCenterFixture.audit || []),
      ...store.listAudit()
    ];

    const detail=buildEntityDetail({
      type,
      id,
      cases:commandCenterFixture.cases || [],
      incidents:commandCenterFixture.incidents || [],
      approvals,
      audit,
      now:new Date()
    });

    if(!detail)return json(res,404,{error:'Detail not found'});

    return json(res,200,{
      ...detail,
      sendMode:'SHADOW_ONLY',
      dataMode:'DEMO'
    });
  }

  if(req.method==='POST' && url.pathname==='/api/operator-action'){
    try{
      const input=await body(req);
      const type=String(input.type || '').toUpperCase();
      const id=String(input.id || '');
      const action=String(input.action || '');

      const plan=planOperatorAction({
        action,
        type,
        id,
        cases:commandCenterFixture.cases || [],
        incidents:commandCenterFixture.incidents || [],
        now:new Date()
      });

      const approvals=store.listApprovals();
      const existing=findEquivalentPendingApproval(approvals,plan);

      if(existing){
        return json(res,200,{
          ok:true,
          created:false,
          approval:existing,
          approvalUrl:'/review',
          sendMode:'SHADOW_ONLY'
        });
      }

      const approval=createApproval({
        approvalId:`APR-LOCAL-${Date.now()}-${approvals.length + 1}`,
        caseId:plan.caseId,
        kind:plan.kind,
        proposedText:plan.proposedText,
        metadata:{
          actionKey:plan.actionKey,
          entityType:plan.entityType,
          entityId:plan.entityId,
          incidentId:plan.incidentId || null,
          source:'DETAIL_ACTION'
        }
      });

      approvals.push(approval);
      store.saveApprovals(approvals);

      store.appendAudit(auditEvent({
        type:plan.auditType,
        caseId:plan.caseId,
        incidentId:plan.incidentId,
        actor:'LOCAL_REVIEWER',
        details:{
          approvalId:approval.approvalId,
          actionKey:plan.actionKey,
          kind:plan.kind
        }
      }));

      return json(res,201,{
        ok:true,
        created:true,
        approval,
        approvalUrl:'/review',
        sendMode:'SHADOW_ONLY'
      });
    }catch(error){
      return json(res,400,{ok:false,error:error.message});
    }
  }

  if(req.method==='GET' && url.pathname==='/api/approvals'){
    return json(res,200,{
      approvals:store.listApprovals().filter(x=>x.status==='PENDING'),
      sendMode:'SHADOW_ONLY'
    });
  }

  const match=url.pathname.match(/^\/api\/approvals\/([^/]+)$/);
  if(req.method==='POST' && match){
    try{
      const id=decodeURIComponent(match[1]);
      const rows=store.listApprovals();
      const index=rows.findIndex(x=>x.approvalId===id);
      if(index<0)return json(res,404,{ok:false,error:'Approval not found'});

      const input=await body(req);
      const updated=applyApprovalAction(rows[index],input);
      rows[index]=updated;
      store.saveApprovals(rows);

      store.appendAudit(auditEvent({
        type:AUDIT_TYPES.APPROVAL_RECORDED,
        caseId:updated.caseId,
        actor:updated.reviewedBy || 'LOCAL_REVIEWER',
        details:{
          approvalId:updated.approvalId,
          action:updated.action,
          status:updated.status
        }
      }));

      return json(res,200,{ok:true,approval:updated,sendMode:'SHADOW_ONLY'});
    }catch(error){
      return json(res,400,{ok:false,error:error.message});
    }
  }

  return json(res,404,{error:'Not found'});
});

const port=Number(process.env.REVIEW_PORT || 8787);
server.listen(port,'127.0.0.1',()=>{
  console.log(`Command Center: http://127.0.0.1:${port}/`);
  console.log(`Shadow review: http://127.0.0.1:${port}/review`);
  console.log('No external message is sent.');
});
