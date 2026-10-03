import { parseMessage } from './domain/intent.js';
import { decideEscalation } from './domain/escalation.js';
import { createCase, transitionCase, CASE_STATES, buildProviderEscalation } from './domain/case.js';
import { createApproval } from './domain/approval.js';
import { MockLookupAdapter } from './adapters/mock.js';
import { composeClientReply } from './domain/reply.js';
import { classifyRisk, canBeAutoSendCandidate } from './domain/risk.js';

const message = process.argv.slice(2).join(' ') || 'customer not received TX10001';
const parsed = parseMessage(message);
const lookup = new MockLookupAdapter();

let record = null;
if (parsed.reference) {
  record = await lookup.getRecordByReference({ accountId:'ACCOUNT-DEMO' }, parsed.reference);
}

const decision = decideEscalation({
  parsed,
  record,
  metrics: parsed.intent === 'BULK_PENDING' || parsed.intent === 'ROUTE_HEALTH'
    ? await lookup.getQueueHealth()
    : null,
  now:new Date('2026-10-03T12:15:00.000Z')
});

const reply = composeClientReply(parsed, record);
const risk = classifyRisk({ parsed, decision });
const autoSendCandidate = canBeAutoSendCandidate(risk, reply);

let caseRecord = null;
let approval = null;

if (parsed.shouldRespond) {
  caseRecord = createCase({
    caseId:'OPS-DEMO-0001',
    accountId:'ACCOUNT-DEMO',
    clientChannelId:'CLIENT-DEMO',
    providerChannelId:'PROVIDER-DEMO',
    reference:parsed.reference,
    intent:parsed.intent,
    clientMessage:message
  });

  caseRecord = transitionCase(caseRecord, CASE_STATES.LOOKUP, {
    lookupSnapshot:record
  });

  if (decision.action === 'ESCALATE_PROVIDER') {
    caseRecord = transitionCase(caseRecord, CASE_STATES.NEEDS_PROVIDER);
    const draft = buildProviderEscalation(caseRecord);
    approval = createApproval({
      approvalId:'APR-DEMO-0001',
      caseId:caseRecord.caseId,
      kind:'PROVIDER_ESCALATION',
      proposedText:draft
    });
  }
}

console.log(JSON.stringify({
  message,
  parsed,
  record,
  decision,
  reply,
  risk,
  autoSendCandidate,
  caseRecord,
  approval,
  mode:'DEMO_ONLY'
}, null, 2));
