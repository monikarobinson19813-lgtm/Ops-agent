function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function contains(message, value) {
  const v = norm(value);
  return v && norm(message).includes(v);
}

function score(message, record, hints = {}) {
  let total = 0;
  const reasons = [];

  if (hints.providerChannelId && record.providerChannelId && hints.providerChannelId !== record.providerChannelId) {
    return { score:-1, reasons:['provider-channel-mismatch'] };
  }

  if (hints.quotedCaseId && hints.quotedCaseId === record.caseId) {
    total += 120;
    reasons.push('quoted-case-id');
  }

  if (contains(message, record.caseId)) {
    total += 100;
    reasons.push('case-id');
  }

  if (contains(message, record.reference)) {
    total += 80;
    reasons.push('reference');
  }

  const tx = record.lookupSnapshot || {};

  if (contains(message, tx.traceId)) {
    total += 70;
    reasons.push('trace-id');
  }

  if (contains(message, tx.clientReference)) {
    total += 60;
    reasons.push('client-reference');
  }

  return { score:total, reasons };
}

export function correlateProviderReply(message, openCases, hints = {}) {
  const scored = (openCases || [])
    .filter(c => !['CLOSED','CLIENT_UPDATED'].includes(c.state))
    .map(c => ({ caseRecord:c, ...score(message, c, hints) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score);

  if (scored.length === 0) {
    return { status:'NO_MATCH', caseRecord:null, candidates:[] };
  }

  if (scored[1] && scored[1].score === scored[0].score) {
    return {
      status:'AMBIGUOUS',
      caseRecord:null,
      candidates:scored
        .filter(x => x.score === scored[0].score)
        .map(x => ({ caseId:x.caseRecord.caseId, score:x.score, reasons:x.reasons }))
    };
  }

  return {
    status:'MATCHED',
    caseRecord:scored[0].caseRecord,
    candidates:[{
      caseId:scored[0].caseRecord.caseId,
      score:scored[0].score,
      reasons:scored[0].reasons
    }]
  };
}
