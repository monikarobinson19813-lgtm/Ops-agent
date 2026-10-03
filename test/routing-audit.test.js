import assert from 'node:assert/strict';
import {
  validateRoutingConfig,
  resolveRoute,
  routeAllowsRecord
} from '../src/domain/routing.js';
import { auditEvent, AUDIT_TYPES } from '../src/domain/audit.js';

const config = {
  clientChannels:[{
    channelKey:'CLIENT_DEMO',
    accountKeys:['ACCOUNT_DEMO'],
    providerChannelKey:'PROVIDER_DEMO',
    enabled:true
  }],
  providerChannels:[{
    channelKey:'PROVIDER_DEMO',
    providerKey:'GENERIC_PROVIDER',
    enabled:true
  }],
  accounts:[{
    accountKey:'ACCOUNT_DEMO',
    externalAliases:['ALIAS_DEMO_1']
  }]
};

{
  const validation = validateRoutingConfig(config);
  assert.equal(validation.ok, true);

  const resolved = resolveRoute(config, 'CLIENT_DEMO');
  assert.equal(resolved.status, 'OK');

  assert.equal(
    routeAllowsRecord(resolved.route, { accountKey:'ACCOUNT_DEMO' }),
    true
  );

  assert.equal(
    routeAllowsRecord(resolved.route, { accountAlias:'ALIAS_DEMO_1' }),
    true
  );

  assert.equal(
    routeAllowsRecord(resolved.route, { accountKey:'OTHER_ACCOUNT' }),
    false
  );
}

{
  const invalid = {
    clientChannels:[{
      channelKey:'CLIENT_DEMO',
      accountKeys:['MISSING'],
      providerChannelKey:'MISSING_PROVIDER'
    }],
    providerChannels:[],
    accounts:[]
  };

  assert.equal(validateRoutingConfig(invalid).ok, false);
  assert.equal(resolveRoute(invalid, 'CLIENT_DEMO').status, 'BLOCK');
}

{
  const event = auditEvent({
    type:AUDIT_TYPES.SCOPE_BLOCKED,
    caseId:'OPS-DEMO-1',
    actor:'SYSTEM',
    details:{ reason:'account mismatch' },
    at:'2026-10-03T12:00:00.000Z'
  });

  assert.equal(event.type, 'SCOPE_BLOCKED');
  assert.equal(event.caseId, 'OPS-DEMO-1');
}

console.log('routing/audit tests passed');
