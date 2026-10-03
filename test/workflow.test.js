import assert from 'node:assert/strict';
import { parseMessage } from '../src/domain/intent.js';
import { decideEscalation } from '../src/domain/escalation.js';
import { createCase, transitionCase, CASE_STATES } from '../src/domain/case.js';
import { correlateProviderReply } from '../src/domain/correlator.js';
import { classifyProviderReply, buildClientUpdate } from '../src/domain/provider-reply.js';
import { messageFingerprint, findExistingOpenCase } from '../src/domain/dedupe.js';
import { sanitizeRecordForClient } from '../src/domain/redaction.js';

{
  const parsed = parseMessage('customer not received TX10001');
  const decision = decideEscalation({
    parsed,
    record:{ status:'SUCCESS', traceId:'TRACE10001' }
  });
  assert.equal(decision.action, 'ESCALATE_PROVIDER');
}

{
  const parsed = parseMessage('status TX10001');
  const decision = decideEscalation({
    parsed,
    record:{
      status:'PROCESSING',
      createdAt:'2026-10-03T12:00:00.000Z'
    },
    thresholds:{ pendingEscalationMinutes:10 },
    now:new Date('2026-10-03T12:15:00.000Z')
  });
  assert.equal(decision.action, 'ESCALATE_PROVIDER');
}

function waitingCase(caseId, reference, traceId) {
  let c = createCase({
    caseId,
    accountId:'ACCOUNT-DEMO',
    clientChannelId:'CLIENT-CHANNEL',
    providerChannelId:'PROVIDER-CHANNEL',
    reference,
    intent:'BENEFICIARY_NOT_RECEIVED',
    clientMessage:'non-receipt'
  });

  c = transitionCase(c, CASE_STATES.WAITING_PROVIDER, {
    lookupSnapshot:{
      reference,
      status:'SUCCESS',
      traceId
    }
  });

  return c;
}

{
  const a = waitingCase('OPS-1', 'TX10001', 'TRACE10001');
  const b = waitingCase('OPS-2', 'TX10002', 'TRACE10002');

  const match = correlateProviderReply(
    'TX10002 success from bank',
    [a,b],
    { providerChannelId:'PROVIDER-CHANNEL' }
  );

  assert.equal(match.status, 'MATCHED');
  assert.equal(match.caseRecord.caseId, 'OPS-2');
}

{
  const a = waitingCase('OPS-1', 'TX10001', 'TRACE10001');
  const match = correlateProviderReply(
    'generic update checking',
    [a],
    { providerChannelId:'PROVIDER-CHANNEL' }
  );

  assert.equal(match.status, 'NO_MATCH');
}

{
  const parsed = classifyProviderReply('TX10001 success from bank. Trace ID TRACE10001');
  assert.equal(parsed.type, 'SUCCESS_CONFIRMATION');

  const update = buildClientUpdate(waitingCase('OPS-1','TX10001','TRACE10001'), parsed);
  assert.equal(update.reviewRequired, true);
  assert.match(update.message, /successful/i);
}

{
  const f1 = messageFingerprint({
    channelId:'C1',
    senderId:'S1',
    text:' check   TX10001 '
  });
  const f2 = messageFingerprint({
    channelId:'c1',
    senderId:'s1',
    text:'check TX10001'
  });
  assert.equal(f1, f2);

  const existing = findExistingOpenCase({
    cases:[waitingCase('OPS-1','TX10001','TRACE10001')],
    accountId:'account-demo',
    reference:'tx10001',
    intent:'BENEFICIARY_NOT_RECEIVED'
  });
  assert.equal(existing.caseId, 'OPS-1');
}

{
  const safe = sanitizeRecordForClient({
    transactionId:'TX1',
    amount:1000,
    status:'SUCCESS',
    beneficiaryAccount:'1234567890'
  });

  assert.equal(safe.beneficiaryAccountMasked, '******7890');
  assert.equal('beneficiaryAccount' in safe, false);
}

console.log('workflow tests passed');
