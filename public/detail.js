function esc(v){
  return String(v ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}
function kv(obj){
  if(!obj)return '<div class="muted">No data</div>';
  return Object.entries(obj).map(([k,v])=>
    `<div class="kv"><strong>${esc(k)}</strong><div>${esc(Array.isArray(v)?v.join(', '):(typeof v==='object'&&v!==null?JSON.stringify(v):v))}</div></div>`
  ).join('');
}
function actionButtons(d){
  const buttons=[];
  const p=d.priority || {};

  if(d.entityType==='CASE'){
    if(['WAITING_PROVIDER','NEEDS_PROVIDER'].includes(d.summary?.state)){
      buttons.push(['DRAFT_PROVIDER_FOLLOWUP','Draft provider follow-up']);
    }
    if(['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(d.summary?.state) && d.approvals?.length>=0){
      buttons.push(['DRAFT_CLIENT_UPDATE','Prepare client update']);
    }
    if(d.summary?.state==='WAITING_CLIENT_EVIDENCE'){
      buttons.push(['DRAFT_CLIENT_EVIDENCE_REQUEST','Request client evidence']);
    }
  }

  if(d.entityType==='INCIDENT' && !['RESOLVED','CLOSED'].includes(d.summary?.state)){
    buttons.push(['DRAFT_PROVIDER_FOLLOWUP','Draft provider incident follow-up']);
  }

  return `
    <div class="actions">
      ${buttons.map(([action,label])=>`<button class="primary" onclick="operatorAction('${esc(d.entityType)}','${esc(d.entityId)}','${esc(action)}')">${esc(label)}</button>`).join('')}
      <a class="action-link secondary" href="/review">Open approvals</a>
    </div>
    <div id="action-status" class="action-status"></div>
  `;
}

async function operatorAction(type,id,action){
  const node=document.querySelector('#action-status');
  if(node)node.textContent='Creating shadow draft...';

  const res=await fetch('/api/operator-action',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({type,id,action})
  });
  const data=await res.json();

  if(!res.ok || !data.ok){
    if(node)node.textContent='Error: '+(data.error || 'Unable to create draft');
    return;
  }

  if(node){
    node.innerHTML=data.created
      ? 'Draft created. <a href="/review">Open approvals</a>'
      : 'An equivalent pending draft already exists. <a href="/review">Open approvals</a>';
  }
}

async function load(){
  const params=new URLSearchParams(location.search);
  const type=params.get('type');
  const id=params.get('id');
  const res=await fetch(`/api/detail?type=${encodeURIComponent(type||'')}&id=${encodeURIComponent(id||'')}`);
  if(!res.ok){
    document.querySelector('#content').innerHTML='<div class="panel">Detail not found.</div>';
    return;
  }
  const d=await res.json();
  const p=d.priority || {};
  const timeline=(d.timeline||[]).map(e=>`
    <div class="event"><strong>${esc(e.label)}</strong><span>${esc(e.at)} · ${esc(e.type)}</span></div>
  `).join('');
  const approvals=(d.approvals||[]).map(a=>`
    <div class="card"><strong>${esc(a.kind)}</strong><div class="muted">${esc(a.status)} · ${esc(a.approvalId)}</div><div style="margin-top:6px;font-size:12px">${esc(a.proposedText)}</div></div>
  `).join('');
  const affected=(d.affectedCases||[]).map(c=>`
    <div class="card"><a href="/detail?type=CASE&id=${encodeURIComponent(c.caseId)}" style="color:inherit;text-decoration:none"><strong>${esc(c.reference||c.caseId)}</strong><div class="muted">${esc(c.intent)} · ${esc(c.state)}</div></a></div>
  `).join('');
  const linked=d.linkedIncident ? `
    <div class="card"><a href="/detail?type=INCIDENT&id=${encodeURIComponent(d.linkedIncident.incidentId)}" style="color:inherit;text-decoration:none"><strong>${esc(d.linkedIncident.incidentId)}</strong><div class="muted">${esc(d.linkedIncident.type)} · ${esc(d.linkedIncident.state)}</div><div style="margin-top:5px;font-size:12px">${esc(d.linkedIncident.summary)}</div></a></div>
  ` : '<div class="muted">No linked incident</div>';

  document.querySelector('#content').innerHTML=`
    <section class="hero">
      <span class="badge">${esc(d.entityType)}</span>
      <span class="badge">${esc(p.priorityBand||'')} ${esc(p.priorityScore||'')}</span>
      <h1>${esc(d.title)}</h1>
      <div class="muted">${esc(d.subtitle)}</div>
      <div style="margin-top:9px;font-size:12px"><strong>Next:</strong> ${esc(p.nextAction||'REVIEW')}</div>
      <div class="muted" style="margin-top:5px">${(p.reasons||[]).map(esc).join(' · ')}</div>
      ${actionButtons(d)}
    </section>
    <div class="grid">
      <section class="panel"><h2>Summary</h2>${kv(d.summary)}</section>
      <section class="panel"><h2>Current facts</h2>${kv(d.facts)}</section>
      <section class="panel"><h2>Follow-up</h2>${d.followup?kv(d.followup):'<div class="muted">No follow-up due</div>'}</section>
      <section class="panel"><h2>${d.entityType==='CASE'?'Linked incident':'Affected cases'}</h2>${d.entityType==='CASE'?linked:(affected||'<div class="muted">No affected demo cases loaded</div>')}</section>
    </div>
    <section class="panel"><h2>Pending / historical approvals</h2>${approvals||'<div class="muted">No approvals for this item</div>'}</section>
    <section class="panel"><h2>Timeline</h2><div class="timeline">${timeline||'<div class="muted">No timeline events</div>'}</div></section>
  `;
}
load();
