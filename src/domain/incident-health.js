export function evaluateIncidentHealth({
  metrics = {},
  thresholds = {}
} = {}) {
  const t = {
    clearPendingCount:0,
    clearOldestPendingMinutes:2,
    recoveringPendingCount:10,
    recoveringOldestPendingMinutes:5,
    ...thresholds
  };

  const pendingCount = Number(metrics.pendingCount ?? 0);
  const oldestPendingMinutes = Number(metrics.oldestPendingMinutes ?? 0);
  const recentSuccessCount = Number(metrics.recentSuccessCount ?? 0);
  const newComplaintCount = Number(metrics.newComplaintCount ?? 0);

  if (
    pendingCount <= t.clearPendingCount &&
    oldestPendingMinutes <= t.clearOldestPendingMinutes &&
    newComplaintCount === 0
  ) {
    return {
      state:'CLEAR',
      reason:'Pending queue and complaint indicators are within clear thresholds.'
    };
  }

  if (
    pendingCount <= t.recoveringPendingCount &&
    oldestPendingMinutes <= t.recoveringOldestPendingMinutes &&
    recentSuccessCount > 0
  ) {
    return {
      state:'RECOVERING',
      reason:'Queue is reducing and successful processing is visible.'
    };
  }

  return {
    state:'DEGRADED',
    reason:'Incident metrics remain outside recovery thresholds.'
  };
}

export function decideIncidentLifecycle({
  incident,
  providerInterpretation = null,
  health = null,
  humanOverride = null
}) {
  if (!incident) throw new Error('Incident is required');

  if (humanOverride?.state) {
    return {
      nextState:humanOverride.state,
      reason:'Explicit human override.',
      confidence:'HUMAN'
    };
  }

  const providerState = providerInterpretation?.update?.nextState || null;
  const healthState = health?.state || null;

  if (providerState === 'RESOLVED') {
    if (healthState === 'CLEAR') {
      return {
        nextState:'RESOLVED',
        reason:'Provider reports resolution and operational health is clear.',
        confidence:'HIGH'
      };
    }

    return {
      nextState:healthState === 'RECOVERING' ? 'RECOVERING' : 'MITIGATING',
      reason:'Provider reports resolution, but operational metrics do not yet support closure.',
      confidence:'MEDIUM'
    };
  }

  if (providerState === 'RECOVERING' || healthState === 'RECOVERING') {
    return {
      nextState:'RECOVERING',
      reason:'Recovery is supported by provider update or operational metrics.',
      confidence:'MEDIUM'
    };
  }

  if (providerState === 'MITIGATING' || healthState === 'DEGRADED') {
    return {
      nextState:'MITIGATING',
      reason:'Incident symptoms remain active.',
      confidence:'MEDIUM'
    };
  }

  if (providerState === 'ACKNOWLEDGED') {
    return {
      nextState:'ACKNOWLEDGED',
      reason:'Provider acknowledged the incident.',
      confidence:'MEDIUM'
    };
  }

  return {
    nextState:incident.state,
    reason:'No strong lifecycle change signal.',
    confidence:'LOW'
  };
}
