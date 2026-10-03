import assert from 'node:assert/strict';
import { parseMessage } from '../src/domain/intent.js';
import {
  createIncident,
  attachReference,
  updateIncident,
  findMatchingIncident,
  INCIDENT_TYPES,
  INCIDENT_STATES
} from '../src/domain/incident.js';

{
  let incident = createIncident({
    incidentId:'INC-1',
    type:INCIDENT_TYPES.QUEUE_DELAY,
    summary:'Demo queue delay',
    relatedReferences:['TX10001']
  });

  incident = attachReference(incident, 'TX10002');
  assert.deepEqual(incident.relatedReferences, ['TX10001','TX10002']);

  incident = updateIncident(incident, INCIDENT_STATES.MITIGATING, {
    metrics:{ pendingCount:12 }
  });
  assert.equal(incident.state, 'MITIGATING');
  assert.equal(incident.metrics.pendingCount, 12);

  const parsed = parseMessage('all payouts pending');
  const found = findMatchingIncident(parsed, [incident]);
  assert.equal(found.incidentId, 'INC-1');
}

{
  const routeIncident = createIncident({
    incidentId:'INC-2',
    type:INCIDENT_TYPES.ROUTE_ISSUE,
    summary:'Demo route issue'
  });

  const parsed = parseMessage('bank route slow?');
  const found = findMatchingIncident(parsed, [routeIncident]);
  assert.equal(found.incidentId, 'INC-2');
}

console.log('incident tests passed');
