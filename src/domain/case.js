export const CASE_STATES = Object.freeze({
  NEW: 'NEW',
  LOOKUP: 'LOOKUP',
  RESOLVED_LOCALLY: 'RESOLVED_LOCALLY',
  NEEDS_PROVIDER: 'NEEDS_PROVIDER',
  WAITING_PROVIDER: 'WAITING_PROVIDER',
  PROVIDER_REPLIED: 'PROVIDER_REPLIED',
  CLIENT_UPDATE_READY: 'CLIENT_UPDATE_READY',
  WAITING_CLIENT_EVIDENCE: 'WAITING_CLIENT_EVIDENCE',
  CLIENT_UPDATED: 'CLIENT_UPDATED',
  CLOSED: 'CLOSED'
});

export function createCase({
  caseId,
  accountId,
  clientChannelId,
  providerChannelId,
  reference,
  intent,
  clientMessage
}) {
  const now = new Date().toISOString();

  return {
    caseId,
    accountId,
    clientChannelId,
    providerChannelId,
    reference,
    intent,
    clientMessage,
    state: CASE_STATES.NEW,
    lookupSnapshot: null,
    providerEscalation: null,
    providerReply: null,
    clientReply: null,
    createdAt: now,
    updatedAt: now
  };
}

export function transitionCase(record, nextState, patch = {}) {
  return {
    ...record,
    ...patch,
    state: nextState,
    updatedAt: new Date().toISOString()
  };
}

export function buildProviderEscalation(record) {
  const tx = record.lookupSnapshot || {};
  const lines = [
    'Please check transaction:',
    record.reference ? `Reference: ${record.reference}` : null,
    tx.amount != null ? `Amount: ${Number(tx.amount).toLocaleString('en-IN')}` : null,
    tx.status ? `Our status: ${String(tx.status).toUpperCase()}` : null,
    tx.traceId ? `Trace ID: ${tx.traceId}` : null,
    record.intent ? `Issue: ${record.intent}` : null
  ].filter(Boolean);

  return lines.join('\n');
}
