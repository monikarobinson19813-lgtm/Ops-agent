function ageMinutes(iso, now = new Date()) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
}

export function buildDashboard({
  cases = [],
  incidents = [],
  approvals = [],
  now = new Date()
}) {
  const openCases = cases.filter(c => !['CLOSED','CLIENT_UPDATED'].includes(c.state));
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');

  return {
    generatedAt:now.toISOString(),
    counts:{
      openCases:openCases.length,
      waitingProvider:cases.filter(c => c.state === 'WAITING_PROVIDER').length,
      waitingClientEvidence:cases.filter(c => c.state === 'WAITING_CLIENT_EVIDENCE').length,
      readyToUpdateClient:cases.filter(c => ['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(c.state)).length,
      activeIncidents:incidents.filter(i => !['RESOLVED','CLOSED'].includes(i.state)).length,
      pendingApprovals:pendingApprovals.length
    },
    openCases:openCases.map(c => ({
      caseId:c.caseId,
      reference:c.reference,
      intent:c.intent,
      state:c.state,
      ageMinutes:ageMinutes(c.createdAt, now),
      updatedMinutesAgo:ageMinutes(c.updatedAt, now)
    }))
  };
}
