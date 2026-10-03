export const APPROVAL_ACTIONS = Object.freeze({
  SEND:'SEND',
  EDIT:'EDIT',
  IGNORE:'IGNORE',
  ESCALATE:'ESCALATE',
  LINK_INCIDENT:'LINK_INCIDENT',
  CLOSE:'CLOSE'
});

export function createApproval({
  approvalId,
  caseId,
  kind,
  proposedText,
  metadata = {}
}) {
  return {
    approvalId,
    caseId,
    kind,
    proposedText:String(proposedText || '').trim(),
    editedText:null,
    metadata,
    status:'PENDING',
    action:null,
    reason:null,
    reviewedBy:null,
    createdAt:new Date().toISOString(),
    reviewedAt:null
  };
}

export function applyApprovalAction(approval, {
  action,
  reviewedBy = 'HUMAN',
  editedText = null,
  reason = null,
  linkedIncidentId = null
}) {
  if (approval.status !== 'PENDING') throw new Error('Approval is no longer pending');
  if (!Object.values(APPROVAL_ACTIONS).includes(action)) throw new Error('Unsupported approval action');

  const next = {
    ...approval,
    action,
    reviewedBy,
    reason:reason || null,
    reviewedAt:new Date().toISOString()
  };

  if (action === 'EDIT') {
    const text = String(editedText || '').trim();
    if (!text) throw new Error('EDIT requires editedText');
    return { ...next, editedText:text, status:'APPROVED_EDITED' };
  }

  if (action === 'SEND') return { ...next, status:'APPROVED' };
  if (action === 'IGNORE') return { ...next, status:'IGNORED' };
  if (action === 'ESCALATE') return { ...next, status:'ESCALATED' };

  if (action === 'LINK_INCIDENT') {
    if (!linkedIncidentId) throw new Error('LINK_INCIDENT requires linkedIncidentId');
    return { ...next, linkedIncidentId, status:'LINKED_INCIDENT' };
  }

  if (action === 'CLOSE') return { ...next, status:'CLOSED' };

  return next;
}

export function approvedText(approval) {
  if (approval.status === 'APPROVED_EDITED') return approval.editedText;
  if (approval.status === 'APPROVED') return approval.proposedText;
  return null;
}
