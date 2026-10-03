function minutesSince(iso, now = new Date()) {
  if (!iso) return 0;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 0;
  return Math.max(0, (now.getTime() - t.getTime()) / 60000);
}

function band(score) {
  if (score >= 90) return 'P0';
  if (score >= 65) return 'P1';
  if (score >= 35) return 'P2';
  return 'P3';
}

const DEFAULT_TRIAGE = Object.freeze({
  highValueAmount:100000,
  incidentAffectedCaseWeightCap:20,
  ageBoostCap:20
});

function followupFor(entityType, entityId, followups) {
  return (followups || []).find(x =>
    x.entityType === entityType &&
    x.entityId === entityId &&
    x.due !== false
  ) || null;
}

export function scoreCase(caseRecord, {
  followups = [],
  now = new Date(),
  thresholds = {}
} = {}) {
  const t = { ...DEFAULT_TRIAGE, ...thresholds };
  const reasons = [];
  let score = 10;
  let nextAction = 'REVIEW_CASE';

  const intent = caseRecord.intent || '';
  const state = caseRecord.state || '';
  const amount = Number(caseRecord.lookupSnapshot?.amount ?? caseRecord.amount ?? 0);
  const age = minutesSince(caseRecord.createdAt, now);
  const followup = followupFor('CASE', caseRecord.caseId, followups);

  if (intent === 'BENEFICIARY_NOT_RECEIVED') {
    score += 45;
    reasons.push('Beneficiary non-receipt');
    nextAction = 'TRACE_OR_ESCALATE';
  }

  if (amount >= t.highValueAmount) {
    score += 20;
    reasons.push('High-value case');
  }

  if (['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(state)) {
    score += 40;
    reasons.push('Confirmed update waiting for client');
    nextAction = 'SEND_CLIENT_UPDATE';
  } else if (['WAITING_PROVIDER','NEEDS_PROVIDER'].includes(state)) {
    score += 15;
    reasons.push('Waiting on provider');
    nextAction = 'CHASE_PROVIDER';
  } else if (state === 'WAITING_CLIENT_EVIDENCE') {
    score += 12;
    reasons.push('Waiting on client evidence');
    nextAction = 'REQUEST_CLIENT_EVIDENCE';
  }

  if (intent === 'PROOF_REQUEST') {
    score += 12;
    reasons.push('Proof requires review/redaction');
  }

  if (intent === 'FAILURE_REASON') {
    score += 8;
    reasons.push('Failure explanation requested');
  }

  if (followup) {
    if (followup.type === 'CLIENT_UPDATE_DUE') score += 30;
    else if (followup.type === 'PROVIDER_CASE_FOLLOWUP') score += 25;
    else if (followup.type === 'CLIENT_EVIDENCE_REMINDER') score += 15;

    reasons.push(followup.reason || 'Follow-up overdue');

    if (followup.type === 'CLIENT_UPDATE_DUE') nextAction = 'SEND_CLIENT_UPDATE';
    if (followup.type === 'PROVIDER_CASE_FOLLOWUP') nextAction = 'CHASE_PROVIDER';
  }

  if (caseRecord.linkedIncidentId) {
    score -= 8;
    reasons.push('Covered by common incident');
    nextAction = 'FOLLOW_INCIDENT';
  }

  const ageBoost = Math.min(t.ageBoostCap, Math.floor(age / 10) * 2);
  if (ageBoost > 0) {
    score += ageBoost;
    reasons.push(`Open ~${Math.round(age)} min`);
  }

  score = Math.max(0, Math.round(score));

  return {
    entityType:'CASE',
    entityId:caseRecord.caseId,
    reference:caseRecord.reference || null,
    priorityScore:score,
    priorityBand:band(score),
    reasons,
    nextAction,
    linkedIncidentId:caseRecord.linkedIncidentId || null
  };
}

export function scoreIncident(incident, {
  followups = [],
  now = new Date(),
  thresholds = {}
} = {}) {
  const t = { ...DEFAULT_TRIAGE, ...thresholds };
  const reasons = [];
  let score = 55;
  let nextAction = 'MONITOR_INCIDENT';

  const affected = (incident.affectedCaseIds || []).length;
  const followup = followupFor('INCIDENT', incident.incidentId, followups);
  const age = minutesSince(incident.createdAt, now);

  if (incident.state === 'MITIGATING' || incident.state === 'OPEN') {
    score += 15;
    reasons.push('Active degraded incident');
  } else if (incident.state === 'RECOVERING') {
    score += 5;
    reasons.push('Incident recovering');
  }

  const affectedBoost = Math.min(t.incidentAffectedCaseWeightCap, affected * 2);
  if (affectedBoost > 0) {
    score += affectedBoost;
    reasons.push(`${affected} affected cases`);
  }

  if (incident.escalationSentAt && !incident.providerUpdatedAt) {
    score += 15;
    reasons.push('Awaiting provider incident update');
    nextAction = 'CHASE_PROVIDER_INCIDENT';
  }

  if (followup?.type === 'PROVIDER_INCIDENT_FOLLOWUP') {
    score += 25;
    reasons.push(followup.reason || 'Provider incident follow-up overdue');
    nextAction = 'CHASE_PROVIDER_INCIDENT';
  }

  const ageBoost = Math.min(t.ageBoostCap, Math.floor(age / 10) * 2);
  if (ageBoost > 0) {
    score += ageBoost;
    reasons.push(`Open ~${Math.round(age)} min`);
  }

  score = Math.max(0, Math.round(score));

  return {
    entityType:'INCIDENT',
    entityId:incident.incidentId,
    priorityScore:score,
    priorityBand:band(score),
    reasons,
    nextAction,
    affectedCaseCount:affected
  };
}

export function buildTriageQueue({
  cases = [],
  incidents = [],
  followups = [],
  now = new Date(),
  thresholds = {}
} = {}) {
  const caseItems = cases
    .filter(c => !['CLOSED','CLIENT_UPDATED'].includes(c.state))
    .map(c => scoreCase(c, { followups, now, thresholds }));

  const incidentItems = incidents
    .filter(i => !['RESOLVED','CLOSED'].includes(i.state))
    .map(i => scoreIncident(i, { followups, now, thresholds }));

  return [...incidentItems, ...caseItems]
    .sort((a,b) =>
      b.priorityScore - a.priorityScore ||
      a.entityType.localeCompare(b.entityType) ||
      String(a.entityId).localeCompare(String(b.entityId))
    )
    .map((item,index) => ({
      rank:index + 1,
      ...item
    }));
}

export { DEFAULT_TRIAGE };
