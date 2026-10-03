import assert from 'node:assert/strict';
import { buildDashboard } from '../src/domain/dashboard.js';

const now=new Date('2026-10-03T12:20:00.000Z');

const dashboard=buildDashboard({
  now,
  cases:[
    {
      caseId:'OPS-1',
      reference:'TX1',
      intent:'TRANSACTION_STATUS',
      state:'WAITING_PROVIDER',
      linkedIncidentId:'INC-1',
      createdAt:'2026-10-03T12:00:00.000Z',
      updatedAt:'2026-10-03T12:10:00.000Z'
    }
  ],
  incidents:[
    {
      incidentId:'INC-1',
      type:'QUEUE_DELAY',
      state:'RECOVERING',
      summary:'Common queue delay',
      affectedCaseIds:['OPS-1','OPS-2','OPS-3'],
      relatedReferences:['TX1','TX2','TX3'],
      escalationSentAt:'2026-10-03T12:05:00.000Z',
      providerUpdatedAt:'2026-10-03T12:15:00.000Z',
      createdAt:'2026-10-03T12:03:00.000Z',
      updatedAt:'2026-10-03T12:15:00.000Z'
    },
    {
      incidentId:'INC-2',
      type:'ROUTE_ISSUE',
      state:'OPEN',
      summary:'Awaiting provider',
      affectedCaseIds:['OPS-4','OPS-5'],
      relatedReferences:['TX4','TX5'],
      escalationSentAt:'2026-10-03T12:12:00.000Z',
      providerUpdatedAt:null,
      createdAt:'2026-10-03T12:11:00.000Z',
      updatedAt:'2026-10-03T12:12:00.000Z'
    }
  ],
  approvals:[]
});

assert.equal(dashboard.counts.activeIncidents,2);
assert.equal(dashboard.counts.incidentAffectedCases,5);
assert.equal(dashboard.counts.recoveringIncidents,1);
assert.equal(dashboard.counts.incidentsAwaitingProviderUpdate,1);
assert.equal(dashboard.activeIncidents.length,2);
assert.equal(dashboard.openCases[0].linkedIncidentId,'INC-1');

console.log('incident dashboard tests passed');
