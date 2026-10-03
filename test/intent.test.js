import assert from 'node:assert/strict';
import { parseMessage } from '../src/domain/intent.js';

const cases = [
  ['pls check TX10001', 'TRANSACTION_STATUS', 'TX10001'],
  ['txn: 123456', 'TRANSACTION_STATUS', '123456'],
  ['utr for TX10001 pls', 'TRACE_LOOKUP', 'TX10001'],
  ['customer not received TX10001', 'BENEFICIARY_NOT_RECEIVED', 'TX10001'],
  ['share proof TX10001', 'PROOF_REQUEST', 'TX10001'],
  ['why failed TX10003', 'FAILURE_REASON', 'TX10003'],
  ['all payouts pending', 'BULK_PENDING', null],
  ['bank route slow?', 'ROUTE_HEALTH', null],
  ['thanks', 'ACK_ONLY', null]
];

for (const [message, intent, reference] of cases) {
  const parsed = parseMessage(message);
  assert.equal(parsed.intent, intent, message);
  assert.equal(parsed.reference, reference, message);
}

{
  const parsed = parseMessage('TX10001 and TX10002 check both');
  assert.equal(parsed.multipleReferences, true);
  assert.deepEqual(parsed.references.slice(0,2), ['TX10001','TX10002']);
}

console.log('intent tests passed');
