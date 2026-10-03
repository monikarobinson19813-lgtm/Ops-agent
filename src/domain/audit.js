export const AUDIT_TYPES = Object.freeze({
  CLIENT_MESSAGE_RECEIVED:'CLIENT_MESSAGE_RECEIVED',
  LOOKUP_STARTED:'LOOKUP_STARTED',
  LOOKUP_COMPLETED:'LOOKUP_COMPLETED',
  SCOPE_BLOCKED:'SCOPE_BLOCKED',
  PROVIDER_DRAFTED:'PROVIDER_DRAFTED',
  PROVIDER_SENT:'PROVIDER_SENT',
  PROVIDER_REPLY_RECEIVED:'PROVIDER_REPLY_RECEIVED',
  PROVIDER_REPLY_MATCHED:'PROVIDER_REPLY_MATCHED',
  PROVIDER_REPLY_AMBIGUOUS:'PROVIDER_REPLY_AMBIGUOUS',
  CLIENT_DRAFTED:'CLIENT_DRAFTED',
  CLIENT_SENT:'CLIENT_SENT',
  APPROVAL_RECORDED:'APPROVAL_RECORDED',
  INCIDENT_LINKED:'INCIDENT_LINKED',
  CASE_CLOSED:'CASE_CLOSED'
});

export function auditEvent({
  type,
  caseId = null,
  incidentId = null,
  actor = 'SYSTEM',
  channelRole = null,
  details = {},
  at = new Date().toISOString()
}) {
  if (!Object.values(AUDIT_TYPES).includes(type)) {
    throw new Error('Unsupported audit event type');
  }

  return {
    at,
    type,
    caseId,
    incidentId,
    actor,
    channelRole,
    details
  };
}
