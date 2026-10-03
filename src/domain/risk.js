export function classifyRisk({ parsed, decision, correlationStatus = null }) {
  if (!parsed) return 'HIGH';

  if (correlationStatus === 'AMBIGUOUS' || correlationStatus === 'NO_MATCH') {
    return 'HIGH';
  }

  if (parsed.multipleReferences) return 'HIGH';

  if ([
    'BENEFICIARY_NOT_RECEIVED',
    'PROOF_REQUEST',
    'ROUTE_HEALTH',
    'BULK_PENDING'
  ].includes(parsed.intent)) {
    return 'MEDIUM';
  }

  if (decision?.action === 'HUMAN_REVIEW' || decision?.action === 'ESCALATE_PROVIDER') {
    return 'MEDIUM';
  }

  if ([
    'TRANSACTION_STATUS',
    'TRACE_LOOKUP',
    'FAILURE_REASON'
  ].includes(parsed.intent) && decision?.action === 'REPLY_LOCAL') {
    return 'LOW';
  }

  return 'MEDIUM';
}

export function canBeAutoSendCandidate(risk, reply) {
  return risk === 'LOW' && reply?.reviewRequired === false;
}
