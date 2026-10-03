import crypto from 'node:crypto';

function norm(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function messageFingerprint({ channelId, senderId, text, quotedMessageId = null }) {
  const basis = [norm(channelId), norm(senderId), norm(text), norm(quotedMessageId)].join('|');
  return crypto.createHash('sha256').update(basis).digest('hex');
}

export function findExistingOpenCase({
  cases = [],
  accountId,
  reference,
  intent = null
}) {
  const ref = norm(reference);
  if (!ref) return null;

  return cases.find(c =>
    !['CLOSED','CLIENT_UPDATED'].includes(c.state) &&
    norm(c.accountId) === norm(accountId) &&
    norm(c.reference) === ref &&
    (!intent || c.intent === intent)
  ) || null;
}
