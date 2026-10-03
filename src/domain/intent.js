const PREFIXED_REF_PATTERN = /\b(?:tx|txn|transaction|ref|reference|order)\b\s*[:#-]?\s*([A-Za-z0-9_-]{3,40})\b/ig;
const TOKEN_PATTERN = /\b(?=[A-Za-z0-9_-]{5,40}\b)(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g;

function extractRefs(text) {
  const refs = [];

  for (const match of text.matchAll(PREFIXED_REF_PATTERN)) {
    if (match?.[1]) refs.push(match[1]);
  }

  for (const token of text.match(TOKEN_PATTERN) || []) {
    if (/^\d{5,40}$/.test(token) || /[A-Za-z].*\d|\d.*[A-Za-z]/.test(token)) {
      refs.push(token);
    }
  }

  return [...new Set(refs.map(x => x.trim()))].slice(0, 10);
}

function classify(lower) {
  if (/^(thanks|thank you|thx|noted|ok|okay|done|cool|great|got it)[.!\s]*$/.test(lower)) {
    return 'ACK_ONLY';
  }

  if (/\b(utr|rrn|trace id)\b/.test(lower)) return 'TRACE_LOOKUP';

  if (/not received|not credited|beneficiary.*not|customer.*not|amount.*not.*receive|not got/.test(lower)) {
    return 'BENEFICIARY_NOT_RECEIVED';
  }

  if (/proof|screenshot|confirmation/.test(lower)) return 'PROOF_REQUEST';
  if (/fail|failed|failure|declin|reject|reason.*fail/.test(lower)) return 'FAILURE_REASON';

  if (/(bank|route|provider).*(slow|down|issue|latency|problem)|(slow|down|latency).*(bank|route|provider)/.test(lower)) {
    return 'ROUTE_HEALTH';
  }

  if (/too many pending|all.*pending|many.*pending|bulk pending|queue|high tps|everything.*slow|pending count/.test(lower)) {
    return 'BULK_PENDING';
  }

  if (/pending|stuck|delay|processing|status|check|payout|transaction|txn|\btx\b/.test(lower)) {
    return 'TRANSACTION_STATUS';
  }

  return 'UNKNOWN';
}

export function parseMessage(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();
  const refs = extractRefs(text);

  let intent = classify(lower);

  if (
    intent === 'BULK_PENDING' &&
    refs.length === 1 &&
    !/all|many|count|high tps|everything/.test(lower)
  ) {
    intent = 'TRANSACTION_STATUS';
  }

  if (intent === 'UNKNOWN' && refs.length > 0 && /update|check|status|please|pls/.test(lower)) {
    intent = 'TRANSACTION_STATUS';
  }

  const shouldRespond = !['ACK_ONLY', 'UNKNOWN'].includes(intent);
  const requiresReference = [
    'TRANSACTION_STATUS',
    'TRACE_LOOKUP',
    'BENEFICIARY_NOT_RECEIVED',
    'FAILURE_REASON',
    'PROOF_REQUEST'
  ].includes(intent);

  return {
    intent,
    reference: refs[0] || null,
    references: refs,
    multipleReferences: refs.length > 1,
    shouldRespond,
    requiresReference,
    originalMessage: text
  };
}
