import assert from 'node:assert/strict';
import {
  evaluateCaseFollowup,
  evaluateIncidentFollowup,
  buildFollowupQueue,
  buildFollowupDraft
} from '../src/domain/followup.js';

const now=new Date('2026-10-03T12:30:00.000Z');

{
  const c={
    caseId:'OPS-1',
    reference:'TX1',
    state:'WAITING_PROVIDER',
    providerEscalatedAt:'2026-10-03T12:10:00.000Z',
    updatedAt:'2026-10-03T12:10:00.000Z'
  };

  const result=evaluateCaseFollowup(c,{now,sla:{providerCaseFollowupMinutes:15}});
  assert.equal(result.due,true);
  assert.equal(result.type,'PROVIDER_CASE_FOLLOWUP');
  assert.match(buildFollowupDraft(result,c),/TX1/);
}

{
  const c={
    caseId:'OPS-2',
    state:'WAITING_CLIENT_EVIDENCE',
    clientEvidenceRequestedAt:'2026-10-03T09:00:00.000Z',
    updatedAt:'2026-10-03T09:00:00.000Z'
  };

  const result=evaluateCaseFollowup(c,{now,sla:{clientEvidenceReminderMinutes:120}});
  assert.equal(result.due,true);
  assert.equal(result.type,'CLIENT_EVIDENCE_REMINDER');
}

{
  const incident={
    incidentId:'INC-1',
    state:'OPEN',
    summary:'Queue delay',
    escalationSentAt:'2026-10-03T12:15:00.000Z',
    providerUpdatedAt:null
  };

  const result=evaluateIncidentFollowup(incident,{now,sla:{providerIncidentFollowupMinutes:10}});
  assert.equal(result.due,true);
  assert.equal(result.type,'PROVIDER_INCIDENT_FOLLOWUP');
}

{
  const queue=buildFollowupQueue({
    now,
    sla:{
      providerCaseFollowupMinutes:15,
      providerIncidentFollowupMinutes:10,
      clientEvidenceReminderMinutes:120
    },
    cases:[
      {
        caseId:'OPS-1',
        reference:'TX1',
        state:'WAITING_PROVIDER',
        providerEscalatedAt:'2026-10-03T12:10:00.000Z'
      },
      {
        caseId:'OPS-2',
        state:'WAITING_CLIENT_EVIDENCE',
        clientEvidenceRequestedAt:'2026-10-03T09:00:00.000Z'
      }
    ],
    incidents:[
      {
        incidentId:'INC-1',
        state:'OPEN',
        escalationSentAt:'2026-10-03T12:15:00.000Z'
      }
    ]
  });

  assert.equal(queue.length,3);
  assert.equal(queue[0].entityId,'OPS-2');
}

console.log('follow-up tests passed');
