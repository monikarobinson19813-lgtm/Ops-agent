import { buildFollowupQueue, buildFollowupDraft } from './followup.js';

export const OPERATOR_ACTIONS = Object.freeze({
  DRAFT_PROVIDER_FOLLOWUP:'DRAFT_PROVIDER_FOLLOWUP',
  DRAFT_CLIENT_UPDATE:'DRAFT_CLIENT_UPDATE',
  DRAFT_CLIENT_EVIDENCE_REQUEST:'DRAFT_CLIENT_EVIDENCE_REQUEST'
});

function getEntity(type, id, cases, incidents) {
  if (type === 'CASE') return cases.find(x => x.caseId === id) || null;
  if (type === 'INCIDENT') return incidents.find(x => x.incidentId === id) || null;
  return null;
}

export function planOperatorAction({
  action,
  type,
  id,
  cases = [],
  incidents = [],
  now = new Date(),
  sla = {}
}) {
  if (!Object.values(OPERATOR_ACTIONS).includes(action)) {
    throw new Error('Unsupported operator action');
  }

  const entity = getEntity(type, id, cases, incidents);
  if (!entity) throw new Error('Entity not found');

  const followups = buildFollowupQueue({ cases, incidents, now, sla });
  const followup = followups.find(x => x.entityType === type && x.entityId === id) || null;

  if (action === OPERATOR_ACTIONS.DRAFT_PROVIDER_FOLLOWUP) {
    if (type === 'CASE' && !['WAITING_PROVIDER','NEEDS_PROVIDER'].includes(entity.state)) {
      throw new Error('Case is not waiting on provider');
    }

    if (type === 'INCIDENT' && ['RESOLVED','CLOSED'].includes(entity.state)) {
      throw new Error('Incident is already closed');
    }

    const text = followup
      ? buildFollowupDraft(followup, entity)
      : type === 'INCIDENT'
        ? `Follow-up please on incident ${entity.incidentId}: ${entity.summary || 'common processing issue'}. Please share the current status/recovery update.`
        : `Follow-up please: status update required for reference ${entity.reference || entity.caseId}.`;

    return {
      kind:'PROVIDER_ESCALATION',
      proposedText:text,
      entityType:type,
      entityId:id,
      caseId:type === 'CASE' ? entity.caseId : null,
      incidentId:type === 'INCIDENT' ? entity.incidentId : null,
      actionKey:`${action}:${type}:${id}`,
      auditType:'PROVIDER_DRAFTED'
    };
  }

  if (action === OPERATOR_ACTIONS.DRAFT_CLIENT_UPDATE) {
    if (type !== 'CASE') throw new Error('Client update draft requires a case');

    const text = entity.clientReply?.message || entity.clientReply;
    if (!text) throw new Error('No confirmed client update is available');

    return {
      kind:'CLIENT_REPLY',
      proposedText:text,
      entityType:type,
      entityId:id,
      caseId:entity.caseId,
      incidentId:entity.linkedIncidentId || null,
      actionKey:`${action}:${type}:${id}`,
      auditType:'CLIENT_DRAFTED'
    };
  }

  if (action === OPERATOR_ACTIONS.DRAFT_CLIENT_EVIDENCE_REQUEST) {
    if (type !== 'CASE') throw new Error('Evidence request draft requires a case');
    if (entity.state !== 'WAITING_CLIENT_EVIDENCE') {
      throw new Error('Case is not waiting for client evidence');
    }

    const text = followup
      ? buildFollowupDraft(followup, entity)
      : 'Please share the requested supporting evidence so further tracing can continue.';

    return {
      kind:'CLIENT_REPLY',
      proposedText:text,
      entityType:type,
      entityId:id,
      caseId:entity.caseId,
      incidentId:entity.linkedIncidentId || null,
      actionKey:`${action}:${type}:${id}`,
      auditType:'CLIENT_DRAFTED'
    };
  }

  throw new Error('Unable to plan operator action');
}

export function findEquivalentPendingApproval(approvals = [], plan) {
  return approvals.find(a =>
    a.status === 'PENDING' &&
    a.metadata?.actionKey === plan.actionKey
  ) || null;
}
