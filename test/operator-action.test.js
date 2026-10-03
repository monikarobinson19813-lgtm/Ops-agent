import assert from 'node:assert/strict';
import {
  OPERATOR_ACTIONS,
  planOperatorAction,
  findEquivalentPendingApproval
} from '../src/domain/operator-action.js';

const now=new Date('2026-10-03T13:00:00.000Z');

const cases=[
  {
    caseId:'OPS-WAIT',
    reference:'TX-WAIT',
    state:'WAITING_PROVIDER',
    intent:'TRANSACTION_STATUS',
    providerEscalatedAt:'2026-10-03T12:30:00.000Z',
    createdAt:'2026-10-03T12:25:00.000Z',
    updatedAt:'2026-10-03T12:30:00.000Z'
  },
  {
    caseId:'OPS-READY',
    reference:'TX-READY',
    state:'CLIENT_UPDATE_READY',
    intent:'TRANSACTION_STATUS',
    clientReply:{message:'Confirmed update ready.'},
    createdAt:'2026-10-03T12:30:00.000Z',
    updatedAt:'2026-10-03T12:40:00.000Z'
  },
  {
    caseId:'OPS-EVIDENCE',
    reference:'TX-EVIDENCE',
    state:'WAITING_CLIENT_EVIDENCE',
    intent:'BENEFICIARY_NOT_RECEIVED',
    clientEvidenceRequestedAt:'2026-10-03T10:00:00.000Z',
    createdAt:'2026-10-03T10:00:00.000Z',
    updatedAt:'2026-10-03T10:00:00.000Z'
  }
];

const incidents=[
  {
    incidentId:'INC-1',
    state:'OPEN',
    summary:'Queue delay',
    escalationSentAt:'2026-10-03T12:30:00.000Z',
    createdAt:'2026-10-03T12:25:00.000Z',
    updatedAt:'2026-10-03T12:30:00.000Z'
  }
];

{
  const plan=planOperatorAction({
    action:OPERATOR_ACTIONS.DRAFT_PROVIDER_FOLLOWUP,
    type:'CASE',
    id:'OPS-WAIT',
    cases,
    incidents,
    now,
    sla:{providerCaseFollowupMinutes:15}
  });
  assert.equal(plan.kind,'PROVIDER_ESCALATION');
  assert.match(plan.proposedText,/TX-WAIT/);
}

{
  const plan=planOperatorAction({
    action:OPERATOR_ACTIONS.DRAFT_CLIENT_UPDATE,
    type:'CASE',
    id:'OPS-READY',
    cases,
    incidents,
    now
  });
  assert.equal(plan.kind,'CLIENT_REPLY');
  assert.equal(plan.proposedText,'Confirmed update ready.');
}

{
  const plan=planOperatorAction({
    action:OPERATOR_ACTIONS.DRAFT_CLIENT_EVIDENCE_REQUEST,
    type:'CASE',
    id:'OPS-EVIDENCE',
    cases,
    incidents,
    now,
    sla:{clientEvidenceReminderMinutes:120}
  });
  assert.equal(plan.kind,'CLIENT_REPLY');
  assert.match(plan.proposedText,/evidence/i);
}

{
  const plan=planOperatorAction({
    action:OPERATOR_ACTIONS.DRAFT_PROVIDER_FOLLOWUP,
    type:'INCIDENT',
    id:'INC-1',
    cases,
    incidents,
    now,
    sla:{providerIncidentFollowupMinutes:10}
  });
  assert.equal(plan.incidentId,'INC-1');

  const existing=findEquivalentPendingApproval([
    {
      approvalId:'APR-1',
      status:'PENDING',
      metadata:{actionKey:plan.actionKey}
    }
  ],plan);

  assert.equal(existing.approvalId,'APR-1');
}

console.log('operator action tests passed');
