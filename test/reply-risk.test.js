import assert from 'node:assert/strict';
import { parseMessage } from '../src/domain/intent.js';
import { decideEscalation } from '../src/domain/escalation.js';
import { composeClientReply } from '../src/domain/reply.js';
import { classifyRisk, canBeAutoSendCandidate } from '../src/domain/risk.js';

{
  const parsed = parseMessage('status TX10001');
  const record = {
    status:'SUCCESS',
    amount:85000,
    traceId:'TRACE10001'
  };
  const decision = decideEscalation({ parsed, record });
  const reply = composeClientReply(parsed, record);
  const risk = classifyRisk({ parsed, decision });

  assert.equal(decision.action, 'REPLY_LOCAL');
  assert.equal(risk, 'LOW');
  assert.equal(canBeAutoSendCandidate(risk, reply), true);
  assert.match(reply.message, /SUCCESS/);
}

{
  const parsed = parseMessage('customer not received TX10001');
  const record = {
    status:'SUCCESS',
    amount:85000,
    traceId:'TRACE10001'
  };
  const decision = decideEscalation({ parsed, record });
  const reply = composeClientReply(parsed, record);
  const risk = classifyRisk({ parsed, decision });

  assert.equal(decision.action, 'ESCALATE_PROVIDER');
  assert.equal(risk, 'MEDIUM');
  assert.equal(canBeAutoSendCandidate(risk, reply), false);
  assert.match(reply.message, /non-receipt/i);
}

{
  const parsed = parseMessage('share proof TX10001');
  const decision = decideEscalation({ parsed, record:{ status:'SUCCESS' } });
  const reply = composeClientReply(parsed, { status:'SUCCESS' });
  const risk = classifyRisk({ parsed, decision });

  assert.equal(risk, 'MEDIUM');
  assert.equal(reply.reviewRequired, true);
}

console.log('reply/risk tests passed');
