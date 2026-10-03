import {
  createIncident,
  INCIDENT_STATES
} from './incident.js';

import {
  detectIncidentCandidates,
  findCoveringIncident,
  linkCasesToIncident
} from './incident-intelligence.js';

function dedupeCases(rows = []) {
  const map = new Map();
  for (const row of rows) {
    if (row?.caseId) map.set(row.caseId, row);
  }
  return [...map.values()];
}

export function planIncidentAction({
  incomingCase,
  openCases = [],
  incidents = [],
  now = new Date(),
  windowMinutes = 10,
  minCases = 3
}) {
  const existing = findCoveringIncident(incomingCase, incidents);

  if (existing) {
    return {
      action:'LINK_EXISTING_INCIDENT',
      suppressIndividualProviderEscalation:true,
      incident:existing,
      candidate:null,
      reason:'An active common incident already covers this case.'
    };
  }

  const cases = dedupeCases([...openCases, incomingCase]);
  const candidates = detectIncidentCandidates(cases, {
    now,
    windowMinutes,
    minCases
  });

  const candidate = candidates.find(x =>
    x.caseIds.includes(incomingCase.caseId)
  );

  if (candidate) {
    return {
      action:'CREATE_COMMON_INCIDENT',
      suppressIndividualProviderEscalation:true,
      incident:null,
      candidate,
      reason:'Matching cases reached the common-incident threshold.'
    };
  }

  return {
    action:'INDIVIDUAL_CASE',
    suppressIndividualProviderEscalation:false,
    incident:null,
    candidate:null,
    reason:'Not enough matching evidence for a common incident.'
  };
}

export function materializeIncident(candidate, {
  incidentId,
  summary = null
}) {
  if (!candidate) throw new Error('Incident candidate is required');

  const incident = createIncident({
    incidentId,
    type:candidate.suggestedType,
    summary:summary || `Common ${candidate.suggestedType.toLowerCase().replaceAll('_',' ')} detected`,
    accountId:candidate.accountId,
    providerChannelId:candidate.providerChannelId,
    relatedReferences:candidate.references
  });

  return {
    ...incident,
    signature:candidate.signature,
    dimensions:candidate.dimensions,
    affectedCaseIds:candidate.caseIds,
    detection:{
      count:candidate.count,
      statuses:candidate.statuses,
      firstSeenAt:candidate.firstSeenAt,
      lastSeenAt:candidate.lastSeenAt
    },
    escalationSentAt:null,
    providerUpdatedAt:null
  };
}

export function attachCaseToIncident(incident, caseRecord) {
  return linkCasesToIncident(incident, [caseRecord]);
}

export function shouldSendIncidentEscalation(incident) {
  if (!incident) return false;
  if (['RESOLVED','CLOSED'].includes(incident.state)) return false;
  return !incident.escalationSentAt;
}

export function markIncidentEscalated(incident, {
  at = new Date().toISOString(),
  draft = null
} = {}) {
  if (!incident) throw new Error('Incident is required');

  return {
    ...incident,
    escalationSentAt:incident.escalationSentAt || at,
    lastProviderDraft:draft || incident.lastProviderDraft || null,
    updatedAt:at
  };
}

export function applyProviderIncidentUpdate(incident, {
  update,
  state = INCIDENT_STATES.ACKNOWLEDGED,
  at = new Date().toISOString()
}) {
  if (!incident) throw new Error('Incident is required');
  if (!update) throw new Error('Provider update is required');

  return {
    ...incident,
    state,
    providerUpdate:update,
    providerUpdatedAt:at,
    updatedAt:at
  };
}


export function shouldPrepareIncidentClientUpdate(incident, {
  now = new Date(),
  minIntervalMinutes = 5,
  force = false
} = {}) {
  if (!incident) return false;
  if (force) return true;

  if (!incident.lastClientUpdatePreparedAt) return true;

  const last = new Date(incident.lastClientUpdatePreparedAt);
  if (Number.isNaN(last.getTime())) return true;

  const providerUpdated = incident.providerUpdatedAt
    ? new Date(incident.providerUpdatedAt)
    : null;

  if (
    providerUpdated &&
    !Number.isNaN(providerUpdated.getTime()) &&
    providerUpdated.getTime() > last.getTime()
  ) return true;

  if (
    incident.lastClientUpdateState &&
    incident.lastClientUpdateState !== incident.state
  ) return true;

  const elapsedMinutes = Math.max(0, (now.getTime() - last.getTime()) / 60000);
  return elapsedMinutes >= minIntervalMinutes;
}

export function markIncidentClientUpdatePrepared(incident, {
  at = new Date().toISOString()
} = {}) {
  if (!incident) throw new Error('Incident is required');

  return {
    ...incident,
    lastClientUpdatePreparedAt:at,
    lastClientUpdateState:incident.state,
    lastClientProviderUpdateSeenAt:incident.providerUpdatedAt || null,
    updatedAt:at
  };
}
