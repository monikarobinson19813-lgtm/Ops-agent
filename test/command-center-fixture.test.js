import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCommandCenter } from '../src/domain/command-center.js';

const fixture=JSON.parse(
  fs.readFileSync(new URL('../fixtures/command-center-demo.json', import.meta.url),'utf8')
);

const model=buildCommandCenter({
  cases:fixture.cases,
  incidents:fixture.incidents,
  approvals:[
    {
      approvalId:'APR-DEMO-1',
      caseId:'OPS-DEMO-READY',
      kind:'CLIENT_REPLY',
      proposedText:'Demo client update',
      status:'PENDING'
    }
  ],
  now:new Date('2026-10-03T13:00:00.000Z'),
  sla:{
    providerCaseFollowupMinutes:15,
    providerIncidentFollowupMinutes:10,
    clientEvidenceReminderMinutes:120,
    readyClientUpdateMinutes:5
  }
});

assert.equal(model.health,'CRITICAL');
assert.equal(model.sections.activeIncidents.length,1);
assert.ok(model.sections.topPriorities.length >= 1);
assert.equal(model.sections.pendingApprovals.length,1);
assert.equal(
  model.sections.waitingProvider.find(x=>x.caseId==='OPS-DEMO-LINKED-1').managedByIncident,
  true
);
assert.equal(model.sections.clientUpdatesReady[0].caseId,'OPS-DEMO-READY');

console.log('command center fixture tests passed');
