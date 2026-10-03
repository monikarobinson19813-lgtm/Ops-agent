function norm(value) {
  return String(value ?? '').trim().toLowerCase();
}

function matchesQuery(item, query) {
  const q=norm(query);
  if (!q) return true;

  const haystack=[
    item.entityId,
    item.reference,
    item.intent,
    item.state,
    item.summary,
    item.priority?.priorityBand,
    item.priority?.nextAction
  ].filter(Boolean).map(norm).join(' ');

  return haystack.includes(q);
}

function matchesView(item, view) {
  if (!view || view === 'ALL') return true;
  if (view === 'URGENT') return ['P0','P1'].includes(item.priority?.priorityBand);
  if (view === 'CNR') return item.intent === 'BENEFICIARY_NOT_RECEIVED';
  if (view === 'WAITING_PROVIDER') return ['WAITING_PROVIDER','NEEDS_PROVIDER'].includes(item.state);
  if (view === 'CLIENT_UPDATES') return ['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(item.state);
  if (view === 'INCIDENTS') return item.entityType === 'INCIDENT';
  if (view === 'APPROVALS') return item.hasPendingApproval === true;
  return true;
}

function matchesPriority(item, priority) {
  if (!priority || priority === 'ALL') return true;
  return item.priority?.priorityBand === priority;
}

export function buildCommandCenterIndex({
  cases = [],
  incidents = [],
  approvals = [],
  triage = []
} = {}) {
  const triageMap=new Map(
    triage.map(x=>[`${x.entityType}:${x.entityId}`,x])
  );

  const approvalCases=new Set(
    approvals
      .filter(a=>a.status === 'PENDING')
      .map(a=>a.caseId)
      .filter(Boolean)
  );

  const caseRows=cases
    .filter(c=>!['CLOSED','CLIENT_UPDATED'].includes(c.state))
    .map(c=>({
      entityType:'CASE',
      entityId:c.caseId,
      reference:c.reference || null,
      intent:c.intent || null,
      state:c.state || null,
      summary:null,
      linkedIncidentId:c.linkedIncidentId || null,
      hasPendingApproval:approvalCases.has(c.caseId),
      priority:triageMap.get(`CASE:${c.caseId}`) || null
    }));

  const incidentRows=incidents
    .filter(i=>!['RESOLVED','CLOSED'].includes(i.state))
    .map(i=>({
      entityType:'INCIDENT',
      entityId:i.incidentId,
      reference:null,
      intent:null,
      state:i.state || null,
      summary:i.summary || null,
      linkedIncidentId:null,
      hasPendingApproval:false,
      priority:triageMap.get(`INCIDENT:${i.incidentId}`) || null
    }));

  return [...incidentRows,...caseRows]
    .sort((a,b)=>
      (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0) ||
      String(a.entityId).localeCompare(String(b.entityId))
    );
}

export function filterCommandCenterIndex(index = [], {
  query = '',
  view = 'ALL',
  priority = 'ALL'
} = {}) {
  return index.filter(item =>
    matchesQuery(item,query) &&
    matchesView(item,view) &&
    matchesPriority(item,priority)
  );
}
