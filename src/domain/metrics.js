function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 10000) / 100;
}

export function buildShadowMetrics({
  approvals = [],
  correlations = [],
  lookups = [],
  cases = []
}) {
  const reviewed = approvals.filter(a => a.status !== 'PENDING');
  const approved = reviewed.filter(a => ['APPROVED','APPROVED_EDITED'].includes(a.status));
  const edited = reviewed.filter(a => a.status === 'APPROVED_EDITED');
  const ignored = reviewed.filter(a => a.status === 'IGNORED');
  const escalated = reviewed.filter(a => a.status === 'ESCALATED');

  const correlationEvaluated = correlations.filter(x =>
    ['MATCHED','NO_MATCH','AMBIGUOUS'].includes(x.status)
  );
  const matched = correlationEvaluated.filter(x => x.status === 'MATCHED');

  const lookupEvaluated = lookups.filter(x => typeof x.correct === 'boolean');
  const lookupCorrect = lookupEvaluated.filter(x => x.correct);

  const closed = cases.filter(c => c.state === 'CLOSED');
  const resolutionMinutes = closed
    .map(c => Number(c.resolutionMinutes))
    .filter(Number.isFinite);

  const averageResolutionMinutes = resolutionMinutes.length
    ? Math.round(
        (resolutionMinutes.reduce((a,b) => a + b, 0) / resolutionMinutes.length) * 100
      ) / 100
    : null;

  return {
    counts:{
      approvalsReviewed:reviewed.length,
      approvalsApproved:approved.length,
      approvalsEdited:edited.length,
      approvalsIgnored:ignored.length,
      approvalsEscalated:escalated.length,
      correlationsEvaluated:correlationEvaluated.length,
      correlationsMatched:matched.length,
      lookupsEvaluated:lookupEvaluated.length,
      lookupsCorrect:lookupCorrect.length,
      closedCases:closed.length
    },
    rates:{
      editRatePct:pct(edited.length, reviewed.length),
      ignoreRatePct:pct(ignored.length, reviewed.length),
      escalationRatePct:pct(escalated.length, reviewed.length),
      correlationMatchRatePct:pct(matched.length, correlationEvaluated.length),
      lookupAccuracyPct:pct(lookupCorrect.length, lookupEvaluated.length)
    },
    timings:{
      averageResolutionMinutes
    }
  };
}

export function evaluateAutomationReadiness(metrics, {
  minReviewedApprovals = 100,
  minCorrelationSamples = 50,
  minLookupSamples = 100,
  maxEditRatePct = 5,
  maxIgnoreRatePct = 2,
  minCorrelationMatchRatePct = 99,
  minLookupAccuracyPct = 99.5
} = {}) {
  const reasons = [];

  if (metrics.counts.approvalsReviewed < minReviewedApprovals) {
    reasons.push('Not enough reviewed approval samples.');
  }

  if (metrics.counts.correlationsEvaluated < minCorrelationSamples) {
    reasons.push('Not enough provider-correlation samples.');
  }

  if (metrics.counts.lookupsEvaluated < minLookupSamples) {
    reasons.push('Not enough lookup accuracy samples.');
  }

  if (metrics.rates.editRatePct > maxEditRatePct) {
    reasons.push('Human edit rate is above threshold.');
  }

  if (metrics.rates.ignoreRatePct > maxIgnoreRatePct) {
    reasons.push('Human ignore rate is above threshold.');
  }

  if (metrics.rates.correlationMatchRatePct < minCorrelationMatchRatePct) {
    reasons.push('Provider correlation accuracy is below threshold.');
  }

  if (metrics.rates.lookupAccuracyPct < minLookupAccuracyPct) {
    reasons.push('Lookup accuracy is below threshold.');
  }

  return {
    ready:reasons.length === 0,
    reasons
  };
}
