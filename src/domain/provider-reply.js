export function classifyProviderReply(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  let type = 'UNKNOWN';

  if (/statement|bank statement/.test(lower)) type = 'EVIDENCE_REQUEST';
  else if (/revert|reversed|reverse|refund|refunded/.test(lower)) type = 'REVERSAL_CONFIRMATION';
  else if (/proof|screenshot|attachment/.test(lower)) type = 'PROOF_AVAILABLE';
  else if (/fail|failed|declin|reject/.test(lower)) type = 'FAILURE_CONFIRMATION';
  else if (/success|successful|bank.*success/.test(lower)) type = 'SUCCESS_CONFIRMATION';
  else if (/wait|checking|will check|in process|processing/.test(lower)) type = 'WAITING_UPDATE';

  const traceMatch = text.match(/\b(?:utr|rrn|trace id)\s*[:#-]?\s*([A-Za-z0-9_-]{6,60})\b/i);

  return {
    type,
    traceId: traceMatch?.[1] || null,
    originalMessage: text
  };
}

export function buildClientUpdate(caseRecord, parsedProviderReply) {
  const tx = caseRecord.lookupSnapshot || {};
  const traceId = parsedProviderReply.traceId || tx.traceId || null;

  switch (parsedProviderReply.type) {
    case 'SUCCESS_CONFIRMATION':
      return {
        reviewRequired:true,
        message:`Checked further. Provider/bank side is also showing successful${traceId ? `. Trace ID: ${traceId}` : ''}. If the beneficiary still reports non-receipt, please ask the beneficiary bank to trace using the reference.`
      };

    case 'EVIDENCE_REQUEST':
      return {
        reviewRequired:true,
        message:'For further tracing, please share the beneficiary bank statement up to the current date/time showing the non-receipt.'
      };

    case 'REVERSAL_CONFIRMATION':
      return {
        reviewRequired:true,
        message:'Update: the upstream side is showing the transaction as reversed/refunded. Please avoid acting on an earlier success state until reconciliation is confirmed.'
      };

    case 'FAILURE_CONFIRMATION':
      return {
        reviewRequired:true,
        message:'Update: the provider has confirmed a failed/declined state. The exact reason remains attached to the case for review.'
      };

    case 'PROOF_AVAILABLE':
      return {
        reviewRequired:true,
        message:'Provider-side proof is available. It should be reviewed and redacted before external sharing.'
      };

    case 'WAITING_UPDATE':
      return {
        reviewRequired:true,
        message:'The case is under upstream review. A client update should be sent once a confirmed response is available.'
      };

    default:
      return {
        reviewRequired:true,
        message:'A provider response was received, but it needs human review before a client update is sent.'
      };
  }
}
