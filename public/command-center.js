function esc(v){
  return String(v ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function empty(label){
  return `<div class="empty">${esc(label)}</div>`;
}
function href(type,id){
  return `/detail?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

function priorityCard(item){
  return `
    <div class="item">
      <div class="row">
        <div>
          <span class="band">${esc(item.priorityBand)} · ${esc(item.priorityScore)}</span>
          <div class="title" style="margin-top:6px"><a href="${href(item.entityType,item.entityId)}" style="color:inherit;text-decoration:none">${esc(item.entityId)}</a></div>
          <div class="muted">${esc(item.entityType)}${item.reference ? ' · ' + esc(item.reference) : ''}</div>
        </div>
        <div class="action">${esc(item.nextAction)}</div>
      </div>
      <div class="reasons">${(item.reasons || []).map(esc).join(' · ')}</div>
    </div>`;
}

function incidentCard(item){
  const p=item.priority || {};
  return `
    <div class="item">
      <div class="row">
        <div>
          <div class="title"><a href="${href('INCIDENT',item.incidentId)}" style="color:inherit;text-decoration:none">${esc(item.incidentId)}</a></div>
          <div class="muted">${esc(item.type)} · ${esc(item.state)}</div>
        </div>
        <span class="band">${esc(p.priorityBand || '')} ${esc(p.priorityScore || '')}</span>
      </div>
      <div class="reasons">${esc(item.summary || '')}</div>
      <div class="muted" style="margin-top:7px">${esc(item.affectedCaseCount)} affected cases${item.awaitingProviderUpdate ? ' · awaiting provider update' : ''}</div>
    </div>`;
}

function waitingCard(item){
  const p=item.priority || {};
  return `
    <div class="item">
      <div class="row">
        <div>
          <div class="title"><a href="${href('CASE',item.caseId)}" style="color:inherit;text-decoration:none">${esc(item.reference || item.caseId)}</a></div>
          <div class="muted">${esc(item.intent)} · ${esc(item.state)}</div>
        </div>
        <span class="band">${esc(p.priorityBand || '')} ${esc(p.priorityScore || '')}</span>
      </div>
      <div class="action">${esc(p.nextAction || 'REVIEW_CASE')}</div>
      ${item.managedByIncident ? `<div class="muted" style="margin-top:6px">Managed by incident ${esc(item.linkedIncidentId)}</div>` : ''}
    </div>`;
}

function updateCard(item){
  return `
    <div class="item">
      <div class="title"><a href="${href('CASE',item.caseId)}" style="color:inherit;text-decoration:none">${esc(item.reference || item.caseId)}</a></div>
      <div class="muted">${esc(item.state)}</div>
      <div class="reasons">${esc(item.clientReply?.message || item.clientReply || 'Update ready for review.')}</div>
    </div>`;
}

function approvalCard(item){
  return `
    <div class="item">
      <div class="title"><a href="${href('CASE',item.caseId)}" style="color:inherit;text-decoration:none">${esc(item.kind)}</a></div>
      <div class="muted">${esc(item.caseId)} · ${esc(item.approvalId)}</div>
      <div class="reasons">${esc(item.proposedText)}</div>
    </div>`;
}

async function load(){
  const res=await fetch('/api/command-center');
  const data=await res.json();

  document.querySelector('#health').innerHTML=
    `<span class="pill">${esc(data.health)}</span><strong>Operational view</strong><span class="muted">${esc(data.generatedAt)}</span>`;

  const s=data.scorecard || {};
  const metrics=[
    ['P0',s.p0Items || 0],
    ['P1',s.p1Items || 0],
    ['Incidents',s.activeIncidents || 0],
    ['Waiting provider',s.waitingProviderCount || 0],
    ['Client updates',s.clientUpdatesReadyCount || 0],
    ['Approvals',s.pendingApprovals || 0]
  ];

  document.querySelector('#scorecard').innerHTML=metrics
    .map(([k,v])=>`<div class="metric"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`)
    .join('');

  const sections=data.sections || {};
  const top=sections.topPriorities || [];
  const incidents=sections.activeIncidents || [];
  const waiting=sections.waitingProvider || [];
  const updates=sections.clientUpdatesReady || [];
  const approvals=sections.pendingApprovals || [];

  document.querySelector('#top-priorities').innerHTML=
    top.length ? top.map(priorityCard).join('') : empty('No priority items.');

  document.querySelector('#active-incidents').innerHTML=
    incidents.length ? incidents.map(incidentCard).join('') : empty('No active incidents.');

  document.querySelector('#waiting-provider').innerHTML=
    waiting.length ? waiting.map(waitingCard).join('') : empty('Nothing waiting on provider.');

  document.querySelector('#client-updates').innerHTML=
    updates.length ? updates.map(updateCard).join('') : empty('No client updates ready.');

  document.querySelector('#pending-approvals').innerHTML=
    approvals.length ? approvals.map(approvalCard).join('') : empty('No pending approvals.');
}

load();
