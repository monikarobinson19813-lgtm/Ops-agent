export function maskAccountNumber(value) {
  const s = String(value || '').replace(/\s+/g, '');
  if (!s) return null;
  if (s.length <= 4) return '*'.repeat(s.length);
  return '*'.repeat(s.length - 4) + s.slice(-4);
}

export function sanitizeRecordForClient(record = {}) {
  return {
    reference:record.reference ?? record.transactionId ?? null,
    clientReference:record.clientReference ?? null,
    amount:record.amount ?? null,
    status:record.status ?? null,
    traceId:record.traceId ?? null,
    createdAt:record.createdAt ?? null,
    processedAt:record.processedAt ?? null,
    providerResponse:record.providerResponse ?? null,
    failureReason:record.failureReason ?? null,
    beneficiaryAccountMasked:record.beneficiaryAccount
      ? maskAccountNumber(record.beneficiaryAccount)
      : record.beneficiaryAccountMasked ?? null
  };
}
