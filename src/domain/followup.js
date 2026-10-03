const DEFAULT_SLA = Object.freeze({
  providerCaseFollowupMinutes:15,
  providerIncidentFollowupMinutes:10,
  clientEvidenceReminderMinutes:120,
  readyClientUpdateMinutes:5
});

function minutesSince(iso, now = new Date()) {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return Math.max(0, (now.getTime() - t.getTime()) / 60000);
}

export function evaluateCaseFollowup(caseRecord, {
  now = new Date(),
  sla = {}
} = {}) {
  const t = { ...DEFAULT_SLA, ...sla };
  const updatedAge = minutesSince(caseRecord.updatedAt || caseRecord.createdAt, now);

  if (['WAITING_PROVIDER','NEEDS_PROVIDER'].includes(caseRecord.state)) {
    const anchor = caseRecord.providerEscalatedAt || caseRecord.updatedAt || caseRecord.createdAt;
    const age = minutesSince(anchor, now);

    if (age != null && age >= t.providerCaseFollowupMinutes) {
      return {
        due:true,
        type:'PROVIDER_CASE_FOLLOWUP',
        ageMinutes:Math.round(age),
        reason:'Provider response is overdue for this case.'
      };
    }
  }

  if (caseRecord.state === 'WAITING_CLIENT_EVIDENCE') {
    const anchor = caseRecord.clientEvidenceRequestedAt || caseRecord.updatedAt || caseRecord.createdAt;
    const age = minutesSince(anchor, now);

    if (age != null && age >= t.clientEvidenceReminderMinutes) {
      return {
        due:true,
        type:'CLIENT_EVIDENCE_REMINDER',
        ageMinutes:Math.round(age),
        reason:'Requested client evidence remains outstanding.'
      };
    }
  }

  if (['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(caseRecord.state)) {
    if (updatedAge != null && updatedAge >= t.readyClientUpdateMinutes) {
      return {
        due:true,
        type:'CLIENT_UPDATE_DUE',
        ageMinutes:Math.round(updatedAge),
        reason:'A confirmed update is ready but has not yet been sent to the client.'
      };
    }
  }

  return {
    due:false,
    type:null,
    ageMinutes:updatedAge == null ? null : Math.round(updatedAge),
    reason:'No case follow-up is due.'
  };
}

export function evaluateIncidentFollowup(incident, {
  now = new Date(),
  sla = {}
} = {}) {
  const t = { ...DEFAULT_SLA, ...sla };

  if (['RESOLVED','CLOSED'].includes(incident.state)) {
    return { due:false, type:null, reason:'Incident is closed.' };
  }

  if (incident.escalationSentAt && !incident.providerUpdatedAt) {
    const age = minutesSince(incident.escalationSentAt, now);

    if (age != null && age >= t.providerIncidentFollowupMinutes) {
      return {
        due:true,
        type:'PROVIDER_INCIDENT_FOLLOWUP',
        ageMinutes:Math.round(age),
        reason:'Provider has not updated the escalated incident within SLA.'
      };
    }
  }

  return {
    due:false,
    type:null,
    reason:'No incident follow-up is due.'
  };
}

export function buildFollowupQueue({
  cases = [],
  incidents = [],
  now = new Date(),
  sla = {}
} = {}) {
  const caseItems = cases
    .map(record => ({
      entityType:'CASE',
      entityId:record.caseId,
      ...evaluateCaseFollowup(record, { now, sla })
    }))
    .filter(x => x.due);

  const incidentItems = incidents
    .map(incident => ({
      entityType:'INCIDENT',
      entityId:incident.incidentId,
      ...evaluateIncidentFollowup(incident, { now, sla })
    }))
    .filter(x => x.due);

  return [...caseItems, ...incidentItems]
    .sort((a,b) => (b.ageMinutes || 0) - (a.ageMinutes || 0));
}

export function buildFollowupDraft(item, entity) {
  if (!item?.due) return null;

  if (item.type === 'PROVIDER_CASE_FOLLOWUP') {
    return `Follow-up please: status update required for reference ${entity.reference || entity.caseId}.`;
  }

  if (item.type === 'PROVIDER_INCIDENT_FOLLOWUP') {
    return `Follow-up please on incident ${entity.incidentId}: ${entity.summary || 'common processing issue'}. Please share current status/recovery update.`;
  }

  if (item.type === 'CLIENT_EVIDENCE_REMINDER') {
    return 'Reminder: the requested supporting evidence is still required for further tracing.';
  }

  if (item.type === 'CLIENT_UPDATE_DUE') {
    return entity.clientReply?.message || entity.clientReply || 'A confirmed case update is ready for client review.';
  }

  return null;
}

export { DEFAULT_SLA };
