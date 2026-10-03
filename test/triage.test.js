import assert from 'node:assert/strict';
import { buildTriageQueue, scoreCase, scoreIncident } from '../src/domain/triage.js';

const now=new Date('2026-10-03T13:00:00.000Z');

const cnr={
  caseId:'OPS-CNR',
  reference:'TX-CNR',
  intent:'BENEFICIARY_NOT_RECEIVED',
  state:'WAITING_PROVIDER',
  createdAt:'2026-10-03T12:20:00.000Z',
  lookupSnapshot:{amount:250000}
};

const ready={
  caseId:'OPS-READY',
  reference:'TX-READY',
  intent:'TRANSACTION_STATUS',
  state:'CLIENT_UPDATE_READY',
  createdAt:'2026-10-03T12:50:00.000Z'
};

const normal={
  caseId:'OPS-NORMAL',
  reference:'TX-NORMAL',
  intent:'TRANSACTION_STATUS',
  state:'LOOKUP',
  createdAt:'2026-10-03T12:55:00.000Z',
  lookupSnapshot:{amount:1000}
};

const incident={
  incidentId:'INC-1',
  type:'QUEUE_DELAY',
  state:'OPEN',
  summary:'Queue delay',
  affectedCaseIds:['A','B','C','D','E','F'],
  createdAt:'2026-10-03T12:30:00.000Z',
  escalationSentAt:'2026-10-03T12:35:00.000Z',
  providerUpdatedAt:null
};

const followups=[
  {
    entityType:'INCIDENT',
    entityId:'INC-1',
    due:true,
    type:'PROVIDER_INCIDENT_FOLLOWUP',
    reason:'Provider update overdue'
  },
  {
    entityType:'CASE',
    entityId:'OPS-READY',
    due:true,
    type:'CLIENT_UPDATE_DUE',
    reason:'Client update ready too long'
  }
];

{
  const scored=scoreCase(cnr,{now});
  assert.ok(scored.priorityScore >= 65);
  assert.equal(scored.nextAction,'CHASE_PROVIDER');
  assert.ok(scored.reasons.includes('Beneficiary non-receipt'));
}

{
  const scored=scoreIncident(incident,{now,followups});
  assert.ok(scored.priorityScore >= 90);
  assert.equal(scored.priorityBand,'P0');
  assert.equal(scored.nextAction,'CHASE_PROVIDER_INCIDENT');
}

{
  const queue=buildTriageQueue({
    cases:[normal,ready,cnr],
    incidents:[incident],
    followups,
    now
  });

  assert.equal(queue[0].entityType,'INCIDENT');
  assert.equal(queue[0].entityId,'INC-1');
  assert.ok(queue.findIndex(x=>x.entityId==='OPS-NORMAL') > queue.findIndex(x=>x.entityId==='OPS-CNR'));
  assert.equal(queue.find(x=>x.entityId==='OPS-READY').nextAction,'SEND_CLIENT_UPDATE');
  assert.deepEqual(queue.map(x=>x.rank),[1,2,3,4]);
}

{
  const linked={
    ...cnr,
    caseId:'OPS-LINKED',
    linkedIncidentId:'INC-1'
  };
  const scored=scoreCase(linked,{now});
  assert.equal(scored.nextAction,'FOLLOW_INCIDENT');
  assert.ok(scored.reasons.includes('Covered by common incident'));
}

console.log('triage tests passed');
