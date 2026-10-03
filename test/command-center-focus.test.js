import assert from 'node:assert/strict';
import {
  buildCommandCenterIndex,
  filterCommandCenterIndex
} from '../src/domain/command-center-focus.js';

const triage=[
  {
    entityType:'INCIDENT',
    entityId:'INC-1',
    priorityBand:'P0',
    priorityScore:110,
    nextAction:'CHASE_PROVIDER_INCIDENT'
  },
  {
    entityType:'CASE',
    entityId:'OPS-CNR',
    priorityBand:'P1',
    priorityScore:82,
    nextAction:'CHASE_PROVIDER'
  },
  {
    entityType:'CASE',
    entityId:'OPS-ROUTINE',
    priorityBand:'P3',
    priorityScore:15,
    nextAction:'REVIEW_CASE'
  }
];

const index=buildCommandCenterIndex({
  cases:[
    {
      caseId:'OPS-CNR',
      reference:'TX-CNR-123',
      intent:'BENEFICIARY_NOT_RECEIVED',
      state:'WAITING_PROVIDER'
    },
    {
      caseId:'OPS-ROUTINE',
      reference:'TX-ROUTINE-999',
      intent:'TRANSACTION_STATUS',
      state:'LOOKUP'
    }
  ],
  incidents:[
    {
      incidentId:'INC-1',
      state:'OPEN',
      summary:'Common route queue delay'
    }
  ],
  approvals:[
    {
      approvalId:'APR-1',
      caseId:'OPS-CNR',
      status:'PENDING'
    }
  ],
  triage
});

assert.equal(index.length,3);

{
  const rows=filterCommandCenterIndex(index,{query:'TX-ROUTINE-999'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].entityId,'OPS-ROUTINE');
}

{
  const rows=filterCommandCenterIndex(index,{view:'URGENT'});
  assert.deepEqual(rows.map(x=>x.entityId),['INC-1','OPS-CNR']);
}

{
  const rows=filterCommandCenterIndex(index,{view:'CNR'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].entityId,'OPS-CNR');
}

{
  const rows=filterCommandCenterIndex(index,{view:'APPROVALS'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].hasPendingApproval,true);
}

{
  const rows=filterCommandCenterIndex(index,{priority:'P3'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].entityId,'OPS-ROUTINE');
}

console.log('command center focus tests passed');
