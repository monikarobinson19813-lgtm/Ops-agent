function esc(value){
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

async function load(){
  const res=await fetch('/api/approvals');
  const data=await res.json();
  const rows=data.approvals || [];

  document.querySelector('#summary').innerHTML=[
    ['Pending',rows.length],
    ['Client replies',rows.filter(x=>x.kind==='CLIENT_REPLY').length],
    ['Provider escalations',rows.filter(x=>x.kind==='PROVIDER_ESCALATION').length]
  ].map(([k,v])=>`<div class="metric"><span class="muted">${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');

  document.querySelector('#queue').innerHTML=rows.map(a=>`
    <div class="card">
      <div class="top">
        <div>
          <span class="badge">${esc(a.kind)}</span>
          <strong style="margin-left:8px">${esc(a.caseId)}</strong>
          <div class="muted">${esc(a.sourceChannel)} → ${esc(a.targetChannel)}</div>
        </div>
        <div><strong>RISK: ${esc(a.risk)}</strong></div>
      </div>

      <div class="label">Reference</div><div>${esc(a.reference)}</div>
      <div class="label">Original context</div><div>${esc(a.context)}</div>
      <div class="label">Facts used</div><div>${esc(a.facts)}</div>
      <div class="label">Proposed message</div>
      <textarea id="text-${esc(a.approvalId)}">${esc(a.proposedText)}</textarea>

      <div class="actions">
        <button class="primary" onclick="act('${esc(a.approvalId)}','SEND')">SEND</button>
        <button class="secondary" onclick="act('${esc(a.approvalId)}','EDIT')">EDIT + APPROVE</button>
        <button class="secondary" onclick="act('${esc(a.approvalId)}','IGNORE')">IGNORE</button>
        <button class="warn" onclick="act('${esc(a.approvalId)}','ESCALATE')">ESCALATE</button>
        <button class="danger" onclick="act('${esc(a.approvalId)}','CLOSE')">CLOSE</button>
      </div>
      <div id="status-${esc(a.approvalId)}" class="status"></div>
    </div>
  `).join('');
}

async function act(id,action){
  const editedText=document.querySelector('#text-'+id)?.value || '';
  const res=await fetch('/api/approvals/'+encodeURIComponent(id),{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      action,
      editedText:action==='EDIT'?editedText:null,
      reviewedBy:'LOCAL_REVIEWER'
    })
  });
  const data=await res.json();
  document.querySelector('#status-'+id).textContent=data.ok?'Decision recorded':'Error: '+(data.error || 'unknown');
  if(data.ok)setTimeout(load,300);
}

load();
