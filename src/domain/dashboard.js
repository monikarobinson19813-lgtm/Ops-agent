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
  followups = [],
  now = new Date()
}) {
  const openCases = cases.filter(c => !['CLOSED','CLIENT_UPDATED'].includes(c.state));
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const activeIncidents = incidents.filter(i => !['RESOLVED','CLOSED'].includes(i.state));

  const incidentRows = activeIncidents.map(i => ({
    incidentId:i.incidentId,
    type:i.type,
    state:i.state,
    summary:i.summary,
    affectedCaseCount:(i.affectedCaseIds || []).length,
    relatedReferenceCount:(i.relatedReferences || []).length,
    providerEscalated:Boolean(i.escalationSentAt),
    awaitingProviderUpdate:Boolean(i.escalationSentAt && !i.providerUpdatedAt),
    providerUpdatedAt:i.providerUpdatedAt || null,
    ageMinutes:ageMinutes(i.createdAt, now),
    updatedMinutesAgo:ageMinutes(i.updatedAt, now)
  }));

  return {
    generatedAt:now.toISOString(),
    counts:{
      openCases:openCases.length,
      waitingProvider:cases.filter(c => c.state === 'WAITING_PROVIDER').length,
      waitingClientEvidence:cases.filter(c => c.state === 'WAITING_CLIENT_EVIDENCE').length,
      readyToUpdateClient:cases.filter(c => ['PROVIDER_REPLIED','CLIENT_UPDATE_READY'].includes(c.state)).length,
      activeIncidents:activeIncidents.length,
      incidentAffectedCases:incidentRows.reduce((sum, i) => sum + i.affectedCaseCount, 0),
      incidentsAwaitingProviderUpdate:incidentRows.filter(i => i.awaitingProviderUpdate).length,
      recoveringIncidents:incidentRows.filter(i => i.state === 'RECOVERING').length,
      pendingApprovals:pendingApprovals.length,
      followupsDue:followups.filter(x => x.due !== false).length,
      providerFollowupsDue:followups.filter(x => ['PROVIDER_CASE_FOLLOWUP','PROVIDER_INCIDENT_FOLLOWUP'].includes(x.type)).length,
      clientEvidenceRemindersDue:followups.filter(x => x.type === 'CLIENT_EVIDENCE_REMINDER').length,
      clientUpdatesDue:followups.filter(x => x.type === 'CLIENT_UPDATE_DUE').length
    },
    openCases:openCases.map(c => ({
      caseId:c.caseId,
      reference:c.reference,
      intent:c.intent,
      state:c.state,
      linkedIncidentId:c.linkedIncidentId || null,
      ageMinutes:ageMinutes(c.createdAt, now),
      updatedMinutesAgo:ageMinutes(c.updatedAt, now)
    })),
    activeIncidents:incidentRows,
    followups
  };
}
