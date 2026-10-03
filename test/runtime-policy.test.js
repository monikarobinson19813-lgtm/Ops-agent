import assert from 'node:assert/strict';
import {
  DEFAULT_RUNTIME_POLICY,
  evaluateSendPermission
} from '../src/domain/runtime-policy.js';

{
  const result=evaluateSendPermission({
    policy:DEFAULT_RUNTIME_POLICY,
    risk:'LOW',
    kind:'CLIENT_REPLY',
    autoSendCandidate:true
  });
  assert.equal(result.allowed,false);
  assert.equal(result.mode,'SHADOW_ONLY');
}

{
  const result=evaluateSendPermission({
    policy:{
      ...DEFAULT_RUNTIME_POLICY,
      externalSendEnabled:true,
      allowLowRiskAutoSend:true
    },
    risk:'LOW',
    kind:'CLIENT_REPLY',
    autoSendCandidate:true
  });
  assert.equal(result.allowed,true);
  assert.equal(result.mode,'AUTO_SEND');
}

{
  const result=evaluateSendPermission({
    policy:{
      ...DEFAULT_RUNTIME_POLICY,
      externalSendEnabled:true
    },
    risk:'MEDIUM',
    kind:'CLIENT_REPLY',
    approval:{status:'APPROVED'}
  });
  assert.equal(result.allowed,true);
  assert.equal(result.mode,'HUMAN_REVIEW');
}

{
  const result=evaluateSendPermission({
    policy:{
      ...DEFAULT_RUNTIME_POLICY,
      externalSendEnabled:true,
      allowProviderAutoSend:true
    },
    risk:'HIGH',
    kind:'PROVIDER_ESCALATION',
    approval:{status:'APPROVED'}
  });
  assert.equal(result.allowed,false);
}

console.log('runtime policy tests passed');
