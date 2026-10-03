import assert from 'node:assert/strict';
import { buildShadowMetrics, evaluateAutomationReadiness } from '../src/domain/metrics.js';

{
  const metrics = buildShadowMetrics({
    approvals:[
      {status:'APPROVED'},
      {status:'APPROVED_EDITED'},
      {status:'IGNORED'},
      {status:'PENDING'}
    ],
    correlations:[
      {status:'MATCHED'},
      {status:'MATCHED'},
      {status:'NO_MATCH'}
    ],
    lookups:[
      {correct:true},
      {correct:true},
      {correct:false}
    ],
    cases:[
      {state:'CLOSED', resolutionMinutes:8},
      {state:'CLOSED', resolutionMinutes:12}
    ]
  });

  assert.equal(metrics.counts.approvalsReviewed, 3);
  assert.equal(metrics.rates.editRatePct, 33.33);
  assert.equal(metrics.rates.correlationMatchRatePct, 66.67);
  assert.equal(metrics.rates.lookupAccuracyPct, 66.67);
  assert.equal(metrics.timings.averageResolutionMinutes, 10);

  const readiness = evaluateAutomationReadiness(metrics, {
    minReviewedApprovals:1,
    minCorrelationSamples:1,
    minLookupSamples:1,
    maxEditRatePct:5,
    maxIgnoreRatePct:5,
    minCorrelationMatchRatePct:99,
    minLookupAccuracyPct:99
  });

  assert.equal(readiness.ready, false);
  assert.ok(readiness.reasons.length >= 1);
}

console.log('metrics tests passed');
