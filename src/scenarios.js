import fs from 'node:fs';
import { runScenarioSuite } from './domain/scenario-simulator.js';

const scenarios=JSON.parse(
  fs.readFileSync(new URL('../fixtures/e2e-scenarios.json',import.meta.url),'utf8')
);

const suite=runScenarioSuite(scenarios);

for(const row of suite.results){
  console.log(`${row.passed ? 'PASS' : 'FAIL'}  ${row.scenarioId}  ${row.title}`);
  for(const check of row.checks){
    console.log(
      `  ${check.passed ? '✓' : '✗'} ${check.path} -> ${JSON.stringify(check.actual)}`
    );
  }
}

console.log('');
console.log(`Scenarios: ${suite.passedCount}/${suite.total} passed`);

if(!suite.passed)process.exitCode=1;
