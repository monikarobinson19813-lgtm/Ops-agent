import assert from 'node:assert/strict';
import {
  planIncidentAction,
  materializeIncident,
  attachCaseToIncident,
  shouldSendIncidentEscalation,
  markIncidentEscalated,
  applyProviderIncidentUpdate
} from '../src/domain/incident-coordinator.js';
import { INCIDENT_STATES } from '../src/domain/incident.js';

function pendingCase(caseId, reference, createdAt) {
  return {
    caseId,
    reference,
    intent:'TRANSACTION_STATUS',
    state:'NEEDS_PROVIDER',
    providerChannelId:'PROVIDER-A',
    accountId:'ACCOUNT-A',
    clientChannelId:'CLIENT-A',
    createdAt,
    lookupSnapshot:{
      status:'PENDING',
      routeKey:'ROUTE-1',
      createdAt
    }
  };
}

const now=new Date('2026-10-03T12:06:00.000Z');
const c1=pendingCase('OPS-1','TX1','2026-10-03T12:00:00.000Z');
const c2=pendingCase('OPS-2','TX2','2026-10-03T12:02:00.000Z');
const c3=pendingCase('OPS-3','TX3','2026-10-03T12:04:00.000Z');
const c4=pendingCase('OPS-4','TX4','2026-10-03T12:05:00.000Z');

{
  const first=planIncidentAction({
    incomingCase:c1,
    openCases:[],
    incidents:[],
    now,
    minCases:3
  });
  assert.equal(first.action,'INDIVIDUAL_CASE');
  assert.equal(first.suppressIndividualProviderEscalation,false);

  const second=planIncidentAction({
    incomingCase:c2,
    openCases:[c1],
    incidents:[],
    now,
    minCases:3
  });
  assert.equal(second.action,'INDIVIDUAL_CASE');

  const third=planIncidentAction({
    incomingCase:c3,
    openCases:[c1,c2],
    incidents:[],
    now,
    minCases:3
  });

  assert.equal(third.action,'CREATE_COMMON_INCIDENT');
  assert.equal(third.suppressIndividualProviderEscalation,true);
  assert.equal(third.candidate.count,3);

  let incident=materializeIncident(third.candidate,{
    incidentId:'INC-1',
    summary:'Common pending queue delay'
  });

  assert.deepEqual(incident.affectedCaseIds,['OPS-1','OPS-2','OPS-3']);
  assert.equal(shouldSendIncidentEscalation(incident),true);

  incident=markIncidentEscalated(incident,{
    at:'2026-10-03T12:06:30.000Z',
    draft:'Consolidated provider draft'
  });

  assert.equal(shouldSendIncidentEscalation(incident),false);

  const fourth=planIncidentAction({
    incomingCase:c4,
    openCases:[c1,c2,c3],
    incidents:[incident],
    now,
    minCases:3
  });

  assert.equal(fourth.action,'LINK_EXISTING_INCIDENT');
  assert.equal(fourth.suppressIndividualProviderEscalation,true);
  assert.equal(fourth.incident.incidentId,'INC-1');

  incident=attachCaseToIncident(incident,c4);
  assert.deepEqual(incident.affectedCaseIds,['OPS-1','OPS-2','OPS-3','OPS-4']);

  incident=applyProviderIncidentUpdate(incident,{
    update:'Route is recovering; pending queue is reducing.',
    state:INCIDENT_STATES.RECOVERING,
    at:'2026-10-03T12:08:00.000Z'
  });

  assert.equal(incident.state,'RECOVERING');
  assert.match(incident.providerUpdate,/recovering/i);
  assert.equal(shouldSendIncidentEscalation(incident),false);
}

console.log('incident coordinator tests passed');
