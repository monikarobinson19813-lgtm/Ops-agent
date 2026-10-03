import { buildFollowupQueue } from './followup.js';
import { buildTriageQueue } from './triage.js';

function event(at, type, label, details = {}) {
  if (!at) return null;
  return { at, type, label, details };
}

function sortTimeline(rows) {
  return rows
    .filter(Boolean)
    .sort((a,b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function caseTimeline(record, audit = []) {
  const rows = [
    event(record.createdAt, 'CASE_CREATED', 'Case created'),
    event(record.providerEscalatedAt, 'PROVIDER_ESCALATED', 'Escalated to provider'),
    event(record.clientEvidenceRequestedAt, 'CLIENT_EVIDENCE_REQUESTED', 'Client evidence requested'),
    event(record.updatedAt, 'CASE_UPDATED', `Case state: ${record.state}`)
  ];

  for (const item of audit.filter(x => x.caseId === record.caseId)) {
    rows.push(event(
      item.at,
      item.type,
      item.type.replaceAll('_',' ').toLowerCase(),
      item.details || {}
    ));
  }

  return sortTimeline(rows);
}

function incidentTimeline(record, audit = []) {
  const rows = [
    event(record.createdAt, 'INCIDENT_CREATED', 'Incident created'),
    event(record.escalationSentAt, 'INCIDENT_ESCALATED', 'Common incident escalated to provider'),
    event(record.providerUpdatedAt, 'PROVIDER_UPDATED', 'Provider updated incident'),
    event(record.lastClientUpdatePreparedAt, 'CLIENT_UPDATE_PREPARED', 'Client incident update prepared'),
    event(record.updatedAt, 'INCIDENT_UPDATED', `Incident state: ${record.state}`)
  ];

  for (const item of audit.filter(x => x.incidentId === record.incidentId)) {
    rows.push(event(
      item.at,
      item.type,
      item.type.replaceAll('_',' ').toLowerCase(),
      item.details || {}
    ));
  }

  return sortTimeline(rows);
}

export function buildEntityDetail({
  type,
  id,
  cases = [],
  incidents = [],
  approvals = [],
  audit = [],
  now = new Date(),
  sla = {},
  triageThresholds = {}
}) {
  const followups = buildFollowupQueue({ cases, incidents, now, sla });
  const triage = buildTriageQueue({
    cases,
    incidents,
    followups,
    now,
    thresholds:triageThresholds
  });

  if (type === 'CASE') {
    const record = cases.find(x => x.caseId === id);
    if (!record) return null;

    const linkedIncident = record.linkedIncidentId
      ? incidents.find(x => x.incidentId === record.linkedIncidentId) || null
      : null;

    return {
      entityType:'CASE',
      entityId:record.caseId,
      title:record.reference || record.caseId,
      subtitle:`${record.intent || 'CASE'} · ${record.state}`,
      priority:triage.find(x => x.entityType === 'CASE' && x.entityId === record.caseId) || null,
      followup:followups.find(x => x.entityType === 'CASE' && x.entityId === record.caseId) || null,
      summary:{
        caseId:record.caseId,
        reference:record.reference || null,
        intent:record.intent || null,
        state:record.state,
        linkedIncidentId:record.linkedIncidentId || null
      },
      facts:record.lookupSnapshot || null,
      linkedIncident:linkedIncident ? {
        incidentId:linkedIncident.incidentId,
        type:linkedIncident.type,
        state:linkedIncident.state,
        summary:linkedIncident.summary
      } : null,
      approvals:approvals.filter(x => x.caseId === record.caseId),
      timeline:caseTimeline(record, audit)
    };
  }

  if (type === 'INCIDENT') {
    const record = incidents.find(x => x.incidentId === id);
    if (!record) return null;

    const affectedCases = cases
      .filter(x => (record.affectedCaseIds || []).includes(x.caseId))
      .map(x => ({
        caseId:x.caseId,
        reference:x.reference || null,
        intent:x.intent || null,
        state:x.state
      }));

    return {
      entityType:'INCIDENT',
      entityId:record.incidentId,
      title:record.incidentId,
      subtitle:`${record.type} · ${record.state}`,
      priority:triage.find(x => x.entityType === 'INCIDENT' && x.entityId === record.incidentId) || null,
      followup:followups.find(x => x.entityType === 'INCIDENT' && x.entityId === record.incidentId) || null,
      summary:{
        incidentId:record.incidentId,
        type:record.type,
        state:record.state,
        summary:record.summary,
        affectedCaseCount:(record.affectedCaseIds || []).length,
        providerUpdate:record.providerUpdate || null
      },
      facts:{
        relatedReferences:record.relatedReferences || [],
        escalationSentAt:record.escalationSentAt || null,
        providerUpdatedAt:record.providerUpdatedAt || null
      },
      affectedCases,
      approvals:[],
      timeline:incidentTimeline(record, audit)
    };
  }

  return null;
}
