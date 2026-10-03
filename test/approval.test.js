import assert from 'node:assert/strict';
import {
  createApproval,
  applyApprovalAction,
  approvedText
} from '../src/domain/approval.js';
import { buildDashboard } from '../src/domain/dashboard.js';

{
  const approval = createApproval({
    approvalId:'APR-1',
    caseId:'OPS-1',
    kind:'CLIENT_REPLY',
    proposedText:'Checked. SUCCESS.'
  });

  const sent = applyApprovalAction(approval, {
    action:'SEND',
    reviewedBy:'reviewer'
  });

  assert.equal(sent.status, 'APPROVED');
  assert.equal(approvedText(sent), 'Checked. SUCCESS.');
}

{
  const approval = createApproval({
    approvalId:'APR-2',
    caseId:'OPS-2',
    kind:'PROVIDER_ESCALATION',
    proposedText:'Please check.'
  });

  const edited = applyApprovalAction(approval, {
    action:'EDIT',
    editedText:'Please check reference TX10002.',
    reviewedBy:'reviewer'
  });

  assert.equal(edited.status, 'APPROVED_EDITED');
  assert.equal(approvedText(edited), 'Please check reference TX10002.');
}

{
  const pending = createApproval({
    approvalId:'APR-3',
    caseId:'OPS-3',
    kind:'CLIENT_REPLY',
    proposedText:'Draft'
  });

  const dashboard = buildDashboard({
    cases:[],
    incidents:[],
    approvals:[pending],
    now:new Date('2026-10-03T13:00:00.000Z')
  });

  assert.equal(dashboard.counts.pendingApprovals, 1);
}

console.log('approval tests passed');
