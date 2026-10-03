export const INCIDENT_TYPES = Object.freeze({
  QUEUE_DELAY:'QUEUE_DELAY',
  ROUTE_ISSUE:'ROUTE_ISSUE',
  PROVIDER_OUTAGE:'PROVIDER_OUTAGE',
  SYSTEM_CONFIGURATION:'SYSTEM_CONFIGURATION'
});

export const INCIDENT_STATES = Object.freeze({
  OPEN:'OPEN',
  ACKNOWLEDGED:'ACKNOWLEDGED',
  MITIGATING:'MITIGATING',
  RECOVERING:'RECOVERING',
  RESOLVED:'RESOLVED',
  CLOSED:'CLOSED'
});

export function createIncident({
  incidentId,
  type,
  summary,
  accountId = null,
  clientChannelId = null,
  providerChannelId = null,
  relatedReferences = []
}) {
  const now = new Date().toISOString();
  return {
    incidentId,
    type,
    state:INCIDENT_STATES.OPEN,
    summary,
    accountId,
    clientChannelId,
    providerChannelId,
    relatedReferences:[...new Set(relatedReferences)],
    metrics:null,
    providerUpdate:null,
    createdAt:now,
    updatedAt:now
  };
}

export function attachReference(incident, reference) {
  return {
    ...incident,
    relatedReferences:[...new Set([...(incident.relatedReferences || []), reference].filter(Boolean))],
    updatedAt:new Date().toISOString()
  };
}

export function updateIncident(incident, nextState, patch = {}) {
  return {
    ...incident,
    ...patch,
    state:nextState,
    updatedAt:new Date().toISOString()
  };
}

export function findMatchingIncident(parsed, incidents = []) {
  if (!parsed) return null;

  const active = incidents.filter(i => !['RESOLVED','CLOSED'].includes(i.state));

  if (parsed.intent === 'BULK_PENDING') {
    return active.find(i => i.type === INCIDENT_TYPES.QUEUE_DELAY) || null;
  }

  if (parsed.intent === 'ROUTE_HEALTH') {
    return active.find(i =>
      [INCIDENT_TYPES.ROUTE_ISSUE, INCIDENT_TYPES.PROVIDER_OUTAGE].includes(i.type)
    ) || null;
  }

  return null;
}
