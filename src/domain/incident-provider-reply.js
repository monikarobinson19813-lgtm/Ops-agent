function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function containsAny(text, values = []) {
  const lower = norm(text);
  return values.some(v => v && lower.includes(norm(v)));
}

export function classifyProviderIncidentReply(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  let type = 'UNKNOWN';
  let suggestedState = 'ACKNOWLEDGED';

  if (/resolved|normal now|working fine|cleared|issue fixed|all clear|back to normal/.test(lower)) {
    type = 'RESOLVED';
    suggestedState = 'RESOLVED';
  } else if (/recover|improving|queue.*reducing|pending.*reducing|movement.*started|processing.*normalizing/.test(lower)) {
    type = 'RECOVERING';
    suggestedState = 'RECOVERING';
  } else if (/degrad|worse|still slow|still pending|issue continues|not resolved|down/.test(lower)) {
    type = 'DEGRADED';
    suggestedState = 'MITIGATING';
  } else if (/checking|working on|identified|issue at bank|bank side|route issue|provider issue|acknowledge/.test(lower)) {
    type = 'ACKNOWLEDGED';
    suggestedState = 'ACKNOWLEDGED';
  }

  return {
    type,
    suggestedState,
    originalMessage:text
  };
}

function scoreIncident(message, incident, hints = {}) {
  if (
    hints.providerChannelId &&
    incident.providerChannelId &&
    hints.providerChannelId !== incident.providerChannelId
  ) {
    return { score:-1, reasons:['provider-channel-mismatch'] };
  }

  let score = 0;
  const reasons = [];

  if (hints.quotedIncidentId && hints.quotedIncidentId === incident.incidentId) {
    score += 150;
    reasons.push('quoted-incident-id');
  }

  if (containsAny(message, [incident.incidentId])) {
    score += 120;
    reasons.push('incident-id');
  }

  const refs = incident.relatedReferences || [];
  const matchedRefs = refs.filter(ref => containsAny(message, [ref]));

  if (matchedRefs.length > 0) {
    score += Math.min(100, 60 + (matchedRefs.length - 1) * 10);
    reasons.push(`reference-match:${matchedRefs.length}`);
  }

  const dims = incident.dimensions || {};
  const dimensionValues = [
    dims.routeKey,
    dims.bankName,
    dims.providerKey
  ].filter(Boolean);

  if (dimensionValues.length && containsAny(message, dimensionValues)) {
    score += 40;
    reasons.push('dimension-match');
  }

  if (incident.type === 'QUEUE_DELAY' && /queue|pending|processing|slow/.test(norm(message))) {
    score += 15;
    reasons.push('queue-symptom');
  }

  if (incident.type === 'ROUTE_ISSUE' && /route|bank|provider|slow|down/.test(norm(message))) {
    score += 15;
    reasons.push('route-symptom');
  }

  return { score, reasons };
}

export function correlateProviderIncidentReply(message, incidents = [], hints = {}) {
  const active = incidents.filter(i => !['CLOSED'].includes(i.state));

  const scored = active
    .map(incident => ({
      incident,
      ...scoreIncident(message, incident, hints)
    }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      status:'NO_MATCH',
      incident:null,
      candidates:[]
    };
  }

  if (scored[1] && scored[1].score === scored[0].score) {
    return {
      status:'AMBIGUOUS',
      incident:null,
      candidates:scored
        .filter(x => x.score === scored[0].score)
        .map(x => ({
          incidentId:x.incident.incidentId,
          score:x.score,
          reasons:x.reasons
        }))
    };
  }

  return {
    status:'MATCHED',
    incident:scored[0].incident,
    candidates:[{
      incidentId:scored[0].incident.incidentId,
      score:scored[0].score,
      reasons:scored[0].reasons
    }]
  };
}

export function interpretIncidentProviderReply(message, incidents = [], hints = {}) {
  const correlation = correlateProviderIncidentReply(message, incidents, hints);
  const parsed = classifyProviderIncidentReply(message);

  if (correlation.status !== 'MATCHED') {
    return {
      correlation,
      parsed,
      update:null,
      reviewRequired:true
    };
  }

  return {
    correlation,
    parsed,
    update:{
      incidentId:correlation.incident.incidentId,
      nextState:parsed.suggestedState,
      providerUpdate:parsed.originalMessage
    },
    reviewRequired:parsed.type === 'UNKNOWN'
  };
}
