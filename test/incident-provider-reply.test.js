import assert from 'node:assert/strict';
import {
  classifyProviderIncidentReply,
  correlateProviderIncidentReply,
  interpretIncidentProviderReply
} from '../src/domain/incident-provider-reply.js';

const incidents=[
  {
    incidentId:'INC-1',
    type:'QUEUE_DELAY',
    state:'OPEN',
    providerChannelId:'PROVIDER-A',
    relatedReferences:['TX1','TX2','TX3'],
    dimensions:{routeKey:'ROUTE-1'}
  },
  {
    incidentId:'INC-2',
    type:'ROUTE_ISSUE',
    state:'OPEN',
    providerChannelId:'PROVIDER-A',
    relatedReferences:['TX9'],
    dimensions:{routeKey:'ROUTE-2'}
  }
];

{
  const parsed=classifyProviderIncidentReply('Queue is reducing and processing is recovering.');
  assert.equal(parsed.type,'RECOVERING');
  assert.equal(parsed.suggestedState,'RECOVERING');
}

{
  const parsed=classifyProviderIncidentReply('Issue fixed, route is normal now.');
  assert.equal(parsed.type,'RESOLVED');
  assert.equal(parsed.suggestedState,'RESOLVED');
}

{
  const match=correlateProviderIncidentReply(
    'TX2 queue is reducing now',
    incidents,
    {providerChannelId:'PROVIDER-A'}
  );

  assert.equal(match.status,'MATCHED');
  assert.equal(match.incident.incidentId,'INC-1');
}

{
  const match=correlateProviderIncidentReply(
    'ROUTE-2 bank issue identified, checking',
    incidents,
    {providerChannelId:'PROVIDER-A'}
  );

  assert.equal(match.status,'MATCHED');
  assert.equal(match.incident.incidentId,'INC-2');
}

{
  const match=correlateProviderIncidentReply(
    'checking',
    incidents,
    {providerChannelId:'PROVIDER-A'}
  );

  assert.equal(match.status,'NO_MATCH');
}

{
  const result=interpretIncidentProviderReply(
    'TX1 queue reducing, recovery started',
    incidents,
    {providerChannelId:'PROVIDER-A'}
  );

  assert.equal(result.correlation.status,'MATCHED');
  assert.equal(result.update.incidentId,'INC-1');
  assert.equal(result.update.nextState,'RECOVERING');
  assert.equal(result.reviewRequired,false);
}

console.log('incident provider reply tests passed');
