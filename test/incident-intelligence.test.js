import assert from 'node:assert/strict';
import {
  detectIncidentCandidates,
  findCoveringIncident,
  decideProviderEscalationSuppression,
  linkCasesToIncident,
  buildConsolidatedProviderEscalation,
  buildIncidentClientUpdates
} from '../src/domain/incident-intelligence.js';

function pendingCase(caseId, reference, {
  providerChannelId='PROVIDER-A',
  accountId='ACCOUNT-A',
  routeKey='ROUTE-1',
  clientChannelId='CLIENT-A',
  createdAt='2026-10-03T12:00:00.000Z'
} = {}) {
  return {
    caseId,
    reference,
    intent:'TRANSACTION_STATUS',
    state:'NEEDS_PROVIDER',
    providerChannelId,
    accountId,
    clientChannelId,
    createdAt,
    lookupSnapshot:{
      status:'PENDING',
      routeKey,
      createdAt
    }
  };
}

{
  const rows=[
    pendingCase('OPS-1','TX1'),
    pendingCase('OPS-2','TX2',{createdAt:'2026-10-03T12:02:00.000Z'}),
    pendingCase('OPS-3','TX3',{createdAt:'2026-10-03T12:04:00.000Z'}),
    pendingCase('OPS-4','TX4',{routeKey:'ROUTE-2'})
  ];

  const candidates=detectIncidentCandidates(rows,{
    now:new Date('2026-10-03T12:06:00.000Z'),
    windowMinutes:10,
    minCases:3
  });

  assert.equal(candidates.length,1);
  assert.equal(candidates[0].count,3);
  assert.equal(candidates[0].dimensions.routeKey,'ROUTE-1');
  assert.equal(candidates[0].suggestedType,'QUEUE_DELAY');
}

{
  const incident={
    incidentId:'INC-1',
    type:'QUEUE_DELAY',
    state:'OPEN',
    accountId:'ACCOUNT-A',
    providerChannelId:'PROVIDER-A',
    dimensions:{routeKey:'ROUTE-1'},
    summary:'Pending queue delay',
    relatedReferences:[]
  };

  const matching=pendingCase('OPS-1','TX1');
  const otherRoute=pendingCase('OPS-2','TX2',{routeKey:'ROUTE-2'});

  assert.equal(findCoveringIncident(matching,[incident]).incidentId,'INC-1');
  assert.equal(findCoveringIncident(otherRoute,[incident]),null);

  const suppression=decideProviderEscalationSuppression(matching,[incident]);
  assert.equal(suppression.suppress,true);

  const linked=linkCasesToIncident(incident,[matching,otherRoute]);
  assert.deepEqual(linked.affectedCaseIds,['OPS-1']);
  assert.deepEqual(linked.relatedReferences,['TX1']);
}

{
  const incident={
    incidentId:'INC-1',
    type:'QUEUE_DELAY',
    state:'OPEN',
    accountId:'ACCOUNT-A',
    providerChannelId:'PROVIDER-A',
    dimensions:{routeKey:'ROUTE-1'},
    summary:'Pending queue delay'
  };

  const rows=[
    pendingCase('OPS-1','TX1'),
    pendingCase('OPS-2','TX2',{createdAt:'2026-10-03T12:02:00.000Z'}),
    pendingCase('OPS-3','TX3',{clientChannelId:'CLIENT-B',createdAt:'2026-10-03T12:03:00.000Z'})
  ];

  const providerDraft=buildConsolidatedProviderEscalation(incident,rows,{
    now:new Date('2026-10-03T12:10:00.000Z')
  });

  assert.match(providerDraft,/Affected cases: 3/);
  assert.match(providerDraft,/Sample refs: TX1, TX2, TX3/);

  const clientUpdates=buildIncidentClientUpdates(incident,rows,{
    providerUpdate:'Bank route is slow; monitoring recovery.'
  });

  assert.equal(clientUpdates.length,2);
  assert.equal(clientUpdates.find(x=>x.clientChannelId==='CLIENT-A').caseIds.length,2);
  assert.equal(clientUpdates.find(x=>x.clientChannelId==='CLIENT-B').caseIds.length,1);
  assert.ok(clientUpdates.every(x=>x.reviewRequired===true));
}

console.log('incident intelligence tests passed');
