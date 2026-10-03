import { buildFollowupQueue } from './followup.js';
import { buildTriageQueue } from './triage.js';
import { buildDashboard } from './dashboard.js';

function followupMap(rows = []) {
  const map = new Map();
  for (const row of rows) {
    map.set(`${row.entityType}:${row.entityId}`, row);
  }
  return map;
}

export function buildCommandCenter({
  cases = [],
  incidents = [],
  approvals = [],
  now = new Date(),
  sla = {},
  triageThresholds = {},
  topLimit = 5
} = {}) {
  const followups = buildFollowupQueue({ cases, incidents, now, sla });
  const triage = buildTriageQueue({
    cases,
    incidents,
    followups,
    now,
    thresholds:triageThresholds
  });

  const dashboard = buildDashboard({
    cases,
    incidents,
    approvals,
    followups,
    triage,
    now
  });

  const fMap = followupMap(followups);
  const triageMap = new Map(
    triage.map(item => [`${item.entityType}:${item.entityId}`, item])
  );

  const activeIncidents = dashboard.activeIncidents
    .map(row => ({
      ...row,
      priority:triageMap.get(`INCIDENT:${row.incidentId}`) || null,
      followup:fMap.get(`INCIDENT:${row.incidentId}`) || null
    }))
    .sort((a,b) =>
      (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0)
    );

  const waitingProvider = cases
    .filter(c => ['WAITING_PROVIDER','NEEDS_PROVIDER'].includes(c.state))
    .map(c => ({
      caseId:c.caseId,
      reference:c.reference || null,
      intent:c.intent || null,
      state:c.state,
      linkedIncidentId:c.linkedIncidentId || null,
      managedByIncident:Boolean(c.linkedIncidentId),
      priority:triageMap.get(`CASE:${c.caseId}`) || null,
      followup:fMap.get(`CASE:${c.caseId}`) || null
    }))
    .sort((a,b) =>
      (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0)
    );

  const clientUpdatesReady = cases
    .filter(c => ['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(c.state))
    .map(c => ({
      caseId:c.caseId,
      reference:c.reference || null,
      intent:c.intent || null,
      state:c.state,
      clientReply:c.clientReply || null,
      priority:triageMap.get(`CASE:${c.caseId}`) || null,
      followup:fMap.get(`CASE:${c.caseId}`) || null
    }))
    .sort((a,b) =>
      (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0)
    );

  const pendingApprovals = approvals
    .filter(a => a.status === 'PENDING')
    .map(a => ({
      approvalId:a.approvalId,
      caseId:a.caseId,
      kind:a.kind,
      proposedText:a.proposedText,
      metadata:a.metadata || {}
    }));

  const topPriorities = triage.slice(0, Math.max(1, topLimit));

  const health =
    topPriorities.some(x => x.priorityBand === 'P0') ? 'CRITICAL' :
    topPriorities.some(x => x.priorityBand === 'P1') ? 'ATTENTION' :
    'NORMAL';

  return {
    generatedAt:now.toISOString(),
    health,
    scorecard:{
      ...dashboard.counts,
      topPriorityCount:topPriorities.length,
      waitingProviderCount:waitingProvider.length,
      clientUpdatesReadyCount:clientUpdatesReady.length
    },
    sections:{
      topPriorities,
      activeIncidents,
      waitingProvider,
      clientUpdatesReady,
      pendingApprovals
    }
  };
}
