function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function minutesBetween(a, b) {
  const aa = new Date(a);
  const bb = new Date(b);
  if (Number.isNaN(aa.getTime()) || Number.isNaN(bb.getTime())) return Infinity;
  return Math.abs(bb.getTime() - aa.getTime()) / 60000;
}

function incidentDimensions(caseRecord) {
  const tx = caseRecord.lookupSnapshot || {};
  return {
    providerChannelId: caseRecord.providerChannelId || null,
    accountId: caseRecord.accountId || null,
    routeKey: tx.routeKey || null,
    bankName: tx.bankName || null,
    providerKey: tx.providerKey || null
  };
}

function signatureFor(caseRecord) {
  const d = incidentDimensions(caseRecord);

  return [
    norm(d.providerChannelId),
    norm(d.accountId),
    norm(d.routeKey || d.bankName || d.providerKey || 'generic')
  ].join('|');
}

function isIncidentLike(caseRecord) {
  const tx = caseRecord.lookupSnapshot || {};
  const status = String(tx.status || '').toUpperCase();

  if (['PENDING','PROCESSING','QUEUED'].includes(status)) return true;

  if (['BULK_PENDING','ROUTE_HEALTH'].includes(caseRecord.intent)) return true;

  return false;
}

export function detectIncidentCandidates(cases = [], {
  now = new Date(),
  windowMinutes = 10,
  minCases = 3
} = {}) {
  const eligible = cases.filter(c =>
    !['CLOSED','CLIENT_UPDATED'].includes(c.state) &&
    isIncidentLike(c) &&
    minutesBetween(c.createdAt, now) <= windowMinutes
  );

  const groups = new Map();

  for (const c of eligible) {
    const signature = signatureFor(c);
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(c);
  }

  return [...groups.entries()]
    .filter(([, rows]) => rows.length >= minCases)
    .map(([signature, rows]) => {
      const createdTimes = rows
        .map(x => new Date(x.createdAt))
        .filter(x => !Number.isNaN(x.getTime()))
        .sort((a,b) => a - b);

      const statuses = rows.reduce((acc, c) => {
        const status = String(c.lookupSnapshot?.status || 'UNKNOWN').toUpperCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return {
        signature,
        caseIds:rows.map(x => x.caseId),
        references:rows.map(x => x.reference).filter(Boolean),
        providerChannelId:rows[0]?.providerChannelId || null,
        accountId:rows[0]?.accountId || null,
        dimensions:incidentDimensions(rows[0]),
        count:rows.length,
        statuses,
        firstSeenAt:createdTimes[0]?.toISOString() || null,
        lastSeenAt:createdTimes.at(-1)?.toISOString() || null,
        suggestedType:rows.some(x => x.intent === 'ROUTE_HEALTH')
          ? 'ROUTE_ISSUE'
          : 'QUEUE_DELAY'
      };
    })
    .sort((a,b) => b.count - a.count);
}

export function incidentMatchesCase(incident, caseRecord) {
  if (!incident || !caseRecord) return false;

  if (
    incident.providerChannelId &&
    caseRecord.providerChannelId &&
    incident.providerChannelId !== caseRecord.providerChannelId
  ) return false;

  if (
    incident.accountId &&
    caseRecord.accountId &&
    incident.accountId !== caseRecord.accountId
  ) return false;

  const caseDims = incidentDimensions(caseRecord);
  const incidentDims = incident.dimensions || {};

  const comparableKeys = ['routeKey','bankName','providerKey'];
  for (const key of comparableKeys) {
    if (incidentDims[key] && caseDims[key] && norm(incidentDims[key]) !== norm(caseDims[key])) {
      return false;
    }
  }

  return isIncidentLike(caseRecord);
}

export function findCoveringIncident(caseRecord, incidents = []) {
  return incidents.find(i =>
    !['RESOLVED','CLOSED'].includes(i.state) &&
    incidentMatchesCase(i, caseRecord)
  ) || null;
}

export function decideProviderEscalationSuppression(caseRecord, incidents = []) {
  const incident = findCoveringIncident(caseRecord, incidents);

  if (!incident) {
    return {
      suppress:false,
      incident:null,
      reason:'No active incident covers this case.'
    };
  }

  return {
    suppress:true,
    incident,
    reason:'An active incident already covers this provider/account/route context.'
  };
}

export function linkCasesToIncident(incident, cases = []) {
  const linked = cases.filter(c => incidentMatchesCase(incident, c));
  const references = [...new Set([
    ...(incident.relatedReferences || []),
    ...linked.map(c => c.reference).filter(Boolean)
  ])];

  const caseIds = [...new Set([
    ...(incident.affectedCaseIds || []),
    ...linked.map(c => c.caseId).filter(Boolean)
  ])];

  return {
    ...incident,
    relatedReferences:references,
    affectedCaseIds:caseIds,
    updatedAt:new Date().toISOString()
  };
}

export function buildConsolidatedProviderEscalation(incident, cases = [], {
  maxSampleReferences = 5,
  now = new Date()
} = {}) {
  const linked = cases.filter(c => incidentMatchesCase(incident, c));
  const statusCounts = linked.reduce((acc, c) => {
    const status = String(c.lookupSnapshot?.status || 'UNKNOWN').toUpperCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pendingAges = linked
    .map(c => {
      const createdAt = c.lookupSnapshot?.createdAt || c.createdAt;
      const t = new Date(createdAt);
      return Number.isNaN(t.getTime())
        ? null
        : Math.max(0, Math.round((now.getTime() - t.getTime()) / 60000));
    })
    .filter(Number.isFinite);

  const oldestPendingMinutes = pendingAges.length ? Math.max(...pendingAges) : null;

  const samples = linked
    .map(c => c.reference)
    .filter(Boolean)
    .slice(0, maxSampleReferences);

  const lines = [
    'Please check common payout issue:',
    `Affected cases: ${linked.length}`,
    oldestPendingMinutes != null ? `Oldest age: ~${oldestPendingMinutes} min` : null,
    Object.keys(statusCounts).length ? `Statuses: ${Object.entries(statusCounts).map(([k,v]) => `${k} ${v}`).join(', ')}` : null,
    samples.length ? `Sample refs: ${samples.join(', ')}` : null,
    incident.summary ? `Observed issue: ${incident.summary}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildIncidentClientUpdates(incident, cases = [], {
  providerUpdate = null
} = {}) {
  const linked = cases.filter(c => incidentMatchesCase(incident, c));
  const groups = new Map();

  for (const c of linked) {
    const key = c.clientChannelId || 'UNKNOWN_CLIENT_CHANNEL';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  return [...groups.entries()].map(([clientChannelId, rows]) => {
    const base = incident.state === 'RESOLVED'
      ? 'Update: the common processing issue is showing resolved.'
      : incident.state === 'RECOVERING'
        ? 'Update: processing is recovering and affected transactions are moving.'
        : 'Update: we are tracking a common upstream processing issue affecting multiple transactions.';

    const channelCount = rows.length;
    const scopedBase = channelCount > 1
      ? `${base} This is currently linked to ${channelCount} affected transactions in this client channel.`
      : base;

    const message = providerUpdate
      ? `${scopedBase} Provider update: ${providerUpdate}`
      : scopedBase;

    return {
      clientChannelId,
      affectedCount:channelCount,
      caseIds:rows.map(x => x.caseId),
      references:rows.map(x => x.reference).filter(Boolean),
      message,
      reviewRequired:true
    };
  });
}
