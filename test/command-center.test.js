import assert from 'node:assert/strict';
import { buildCommandCenter } from '../src/domain/command-center.js';

const now=new Date('2026-10-03T13:00:00.000Z');

const cases=[
  {
    caseId:'OPS-CNR',
    reference:'TX-CNR',
    intent:'BENEFICIARY_NOT_RECEIVED',
    state:'WAITING_PROVIDER',
    createdAt:'2026-10-03T12:20:00.000Z',
    providerEscalatedAt:'2026-10-03T12:20:00.000Z',
    updatedAt:'2026-10-03T12:20:00.000Z',
    lookupSnapshot:{amount:250000}
  },
  {
    caseId:'OPS-READY',
    reference:'TX-READY',
    intent:'TRANSACTION_STATUS',
    state:'CLIENT_UPDATE_READY',
    createdAt:'2026-10-03T12:40:00.000Z',
    updatedAt:'2026-10-03T12:40:00.000Z',
    clientReply:{message:'Confirmed provider update ready.'}
  },
  {
    caseId:'OPS-LINKED',
    reference:'TX-LINKED',
    intent:'TRANSACTION_STATUS',
    state:'WAITING_PROVIDER',
    linkedIncidentId:'INC-1',
    createdAt:'2026-10-03T12:35:00.000Z',
    updatedAt:'2026-10-03T12:35:00.000Z'
  }
];

const incidents=[
  {
    incidentId:'INC-1',
    type:'QUEUE_DELAY',
    state:'OPEN',
    summary:'Common queue delay',
    affectedCaseIds:['OPS-LINKED','OPS-X','OPS-Y','OPS-Z'],
    relatedReferences:['TX-LINKED','TX-X','TX-Y','TX-Z'],
    createdAt:'2026-10-03T12:30:00.000Z',
    updatedAt:'2026-10-03T12:35:00.000Z',
    escalationSentAt:'2026-10-03T12:35:00.000Z',
    providerUpdatedAt:null
  }
];

const approvals=[
  {
    approvalId:'APR-1',
    caseId:'OPS-READY',
    kind:'CLIENT_REPLY',
    proposedText:'Confirmed provider update ready.',
    status:'PENDING'
  }
];

const center=buildCommandCenter({
  cases,
  incidents,
  approvals,
  now,
  sla:{
    providerCaseFollowupMinutes:15,
    providerIncidentFollowupMinutes:10,
    readyClientUpdateMinutes:5
  },
  topLimit:3
});

assert.equal(center.health,'CRITICAL');
assert.equal(center.sections.topPriorities.length,3);
assert.equal(center.sections.topPriorities[0].entityType,'INCIDENT');
assert.equal(center.sections.topPriorities[0].entityId,'INC-1');

assert.equal(center.sections.activeIncidents.length,1);
assert.equal(center.sections.activeIncidents[0].followup.type,'PROVIDER_INCIDENT_FOLLOWUP');

assert.equal(center.sections.waitingProvider.length,2);
assert.equal(
  center.sections.waitingProvider.find(x=>x.caseId==='OPS-LINKED').managedByIncident,
  true
);

assert.equal(center.sections.clientUpdatesReady.length,1);
assert.equal(center.sections.clientUpdatesReady[0].caseId,'OPS-READY');
assert.equal(center.sections.pendingApprovals.length,1);

assert.equal(center.scorecard.activeIncidents,1);
assert.equal(center.scorecard.clientUpdatesReadyCount,1);
assert.ok(center.scorecard.p0Items >= 1);

console.log('command center tests passed');
