export const DEFAULT_THRESHOLDS = Object.freeze({
  pendingEscalationMinutes: 10,
  missingTraceEscalationMinutes: 5,
  bulkPendingCount: 20,
  bulkOldestPendingMinutes: 8
});

function ageMinutes(isoTime, now = new Date()) {
  if (!isoTime) return null;
  const then = new Date(isoTime);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, (now.getTime() - then.getTime()) / 60000);
}

export function decideEscalation({
  parsed,
  record = null,
  metrics = null,
  thresholds = {},
  now = new Date()
}) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  if (!parsed?.shouldRespond) return { action:'NO_ACTION', reason:'No operational response required.' };

  if (parsed.intent === 'BENEFICIARY_NOT_RECEIVED') {
    return { action:'ESCALATE_PROVIDER', reason:'Non-receipt needs upstream/bank-side confirmation.' };
  }

  if (parsed.intent === 'PROOF_REQUEST') {
    return { action:'HUMAN_REVIEW', reason:'Proof must be reviewed/redacted before sharing.' };
  }

  if (parsed.intent === 'ROUTE_HEALTH') {
    return metrics?.knownIncident
      ? { action:'USE_INCIDENT', reason:'Known incident already explains the query.' }
      : { action:'ESCALATE_PROVIDER', reason:'Route health requires live upstream confirmation.' };
  }

  if (parsed.intent === 'BULK_PENDING') {
    const pendingCount = Number(metrics?.pendingCount ?? 0);
    const oldest = Number(metrics?.oldestPendingMinutes ?? 0);

    return pendingCount >= t.bulkPendingCount || oldest >= t.bulkOldestPendingMinutes
      ? { action:'ESCALATE_PROVIDER', reason:'Bulk metrics exceed configured threshold.' }
      : { action:'REPLY_LOCAL', reason:'Bulk metrics remain below configured threshold.' };
  }

  if (!record && parsed.requiresReference) {
    return { action:'HUMAN_REVIEW', reason:'No verified record was found.' };
  }

  const status = String(record?.status || '').toUpperCase();
  const age = ageMinutes(record?.createdAt, now);

  if (parsed.intent === 'TRACE_LOOKUP') {
    if (record?.traceId) return { action:'REPLY_LOCAL', reason:'Trace ID is available.' };

    if (status === 'SUCCESS' && age != null && age >= t.missingTraceEscalationMinutes) {
      return { action:'ESCALATE_PROVIDER', reason:'Successful record has no trace ID beyond threshold.' };
    }

    return { action:'HUMAN_REVIEW', reason:'Trace ID is not available yet.' };
  }

  if (parsed.intent === 'FAILURE_REASON') {
    if (status === 'FAILED' && (record?.failureReason || record?.providerResponse)) {
      return { action:'REPLY_LOCAL', reason:'Confirmed failure with readable reason.' };
    }
    return { action:'HUMAN_REVIEW', reason:'Failure state/reason is not conclusive.' };
  }

  if (parsed.intent === 'TRANSACTION_STATUS') {
    if (['SUCCESS','FAILED','REVERSED'].includes(status)) {
      return { action:'REPLY_LOCAL', reason:'Terminal state is available locally.' };
    }

    if (['PROCESSING','PENDING','QUEUED'].includes(status) && age != null && age >= t.pendingEscalationMinutes) {
      return { action:'ESCALATE_PROVIDER', reason:'Pending age exceeds configured threshold.' };
    }

    return { action:'REPLY_LOCAL', reason:'Current status can be answered locally.' };
  }

  return { action:'HUMAN_REVIEW', reason:'No approved automatic rule matched.' };
}
