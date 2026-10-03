import assert from 'node:assert/strict';
import { buildEntityDetail } from '../src/domain/detail.js';

const now=new Date('2026-10-03T13:00:00.000Z');

const cases=[
  {
    caseId:'OPS-1',
    reference:'TX1',
    intent:'BENEFICIARY_NOT_RECEIVED',
    state:'WAITING_PROVIDER',
    linkedIncidentId:'INC-1',
    createdAt:'2026-10-03T12:20:00.000Z',
    updatedAt:'2026-10-03T12:30:00.000Z',
    providerEscalatedAt:'2026-10-03T12:25:00.000Z',
    lookupSnapshot:{amount:250000,status:'SUCCESS',traceId:'TRACE1'}
  }
];

const incidents=[
  {
    incidentId:'INC-1',
    type:'QUEUE_DELAY',
    state:'OPEN',
    summary:'Common queue delay',
    affectedCaseIds:['OPS-1'],
    relatedReferences:['TX1'],
    createdAt:'2026-10-03T12:22:00.000Z',
    updatedAt:'2026-10-03T12:35:00.000Z',
    escalationSentAt:'2026-10-03T12:26:00.000Z',
    providerUpdatedAt:null
  }
];

const approvals=[
  {
    approvalId:'APR-1',
    caseId:'OPS-1',
    kind:'PROVIDER_ESCALATION',
    proposedText:'Please check.',
    status:'PENDING'
  }
];

const audit=[
  {
    at:'2026-10-03T12:27:00.000Z',
    type:'PROVIDER_DRAFTED',
    caseId:'OPS-1',
    details:{approvalId:'APR-1'}
  }
];

{
  const detail=buildEntityDetail({
    type:'CASE',
    id:'OPS-1',
    cases,
    incidents,
    approvals,
    audit,
    now,
    sla:{providerCaseFollowupMinutes:15}
  });

  assert.equal(detail.entityType,'CASE');
  assert.equal(detail.title,'TX1');
  assert.equal(detail.linkedIncident.incidentId,'INC-1');
  assert.equal(detail.approvals.length,1);
  assert.equal(detail.facts.traceId,'TRACE1');
  assert.ok(detail.timeline.length >= 4);
  assert.ok(detail.priority);
}

{
  const detail=buildEntityDetail({
    type:'INCIDENT',
    id:'INC-1',
    cases,
    incidents,
    approvals,
    audit,
    now,
    sla:{providerIncidentFollowupMinutes:10}
  });

  assert.equal(detail.entityType,'INCIDENT');
  assert.equal(detail.affectedCases.length,1);
  assert.equal(detail.affectedCases[0].caseId,'OPS-1');
  assert.ok(detail.timeline.length >= 3);
  assert.ok(detail.priority);
}

assert.equal(buildEntityDetail({type:'CASE',id:'MISSING',cases,incidents}),null);

console.log('detail view tests passed');
