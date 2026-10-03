export const DEFAULT_RUNTIME_POLICY = Object.freeze({
  externalSendEnabled:false,
  allowLowRiskAutoSend:false,
  allowProviderAutoSend:false,
  forceHumanReviewForMediumRisk:true,
  forceHumanReviewForHighRisk:true
});

export function evaluateSendPermission({
  policy = DEFAULT_RUNTIME_POLICY,
  approval = null,
  risk = 'HIGH',
  kind = 'CLIENT_REPLY',
  autoSendCandidate = false
}) {
  if (!policy.externalSendEnabled) {
    return {
      allowed:false,
      mode:'SHADOW_ONLY',
      reason:'External sending is globally disabled.'
    };
  }

  if (risk === 'HIGH' && policy.forceHumanReviewForHighRisk !== false) {
    return {
      allowed:false,
      mode:'HUMAN_REVIEW',
      reason:'High-risk case requires human review.'
    };
  }

  if (risk === 'MEDIUM' && policy.forceHumanReviewForMediumRisk !== false) {
    return {
      allowed:Boolean(approval && ['APPROVED','APPROVED_EDITED'].includes(approval.status)),
      mode:'HUMAN_REVIEW',
      reason:'Medium-risk case requires an approved human decision.'
    };
  }

  if (kind === 'PROVIDER_ESCALATION' && !policy.allowProviderAutoSend) {
    return {
      allowed:Boolean(approval && ['APPROVED','APPROVED_EDITED'].includes(approval.status)),
      mode:'HUMAN_REVIEW',
      reason:'Provider escalations require human approval.'
    };
  }

  if (risk === 'LOW' && autoSendCandidate && policy.allowLowRiskAutoSend) {
    return {
      allowed:true,
      mode:'AUTO_SEND',
      reason:'Low-risk case is an approved auto-send candidate.'
    };
  }

  return {
    allowed:Boolean(approval && ['APPROVED','APPROVED_EDITED'].includes(approval.status)),
    mode:'HUMAN_REVIEW',
    reason:'Human approval is required by runtime policy.'
  };
}
