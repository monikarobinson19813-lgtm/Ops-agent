import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runScenarioSuite } from '../src/domain/scenario-simulator.js';

const scenarios=JSON.parse(
  fs.readFileSync(new URL('../fixtures/e2e-scenarios.json',import.meta.url),'utf8')
);

const suite=runScenarioSuite(scenarios);

assert.equal(suite.total,5);
assert.equal(suite.failedCount,0);
assert.equal(suite.passedCount,5);
assert.equal(suite.passed,true);

const s4=suite.results.find(x=>x.scenarioId==='S4_COMMON_QUEUE_RECOVERY');
assert.equal(s4.result.incident.state,'RECOVERING');
assert.equal(s4.result.commandCenter.sections.activeIncidents.length,1);

const s3=suite.results.find(x=>x.scenarioId==='S3_CNR_PROVIDER_TRACE');
assert.equal(s3.result.commandCenter.sections.clientUpdatesReady.length,1);

console.log('end-to-end scenario tests passed');
