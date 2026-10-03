export function validateRoutingConfig(config) {
  const errors = [];
  const clientChannels = config?.clientChannels || [];
  const providerChannels = config?.providerChannels || [];
  const accounts = config?.accounts || [];

  const unique = (rows, key, label) => {
    const seen = new Set();
    for (const row of rows) {
      const value = row?.[key];
      if (!value) errors.push(`${label} missing ${key}`);
      else if (seen.has(value)) errors.push(`Duplicate ${label} ${key}: ${value}`);
      else seen.add(value);
    }
  };

  unique(clientChannels, 'channelKey', 'clientChannel');
  unique(providerChannels, 'channelKey', 'providerChannel');
  unique(accounts, 'accountKey', 'account');

  const providerKeys = new Set(providerChannels.map(x => x.channelKey));
  const accountKeys = new Set(accounts.map(x => x.accountKey));

  for (const channel of clientChannels) {
    if (!providerKeys.has(channel.providerChannelKey)) {
      errors.push(`Unknown providerChannelKey for ${channel.channelKey}`);
    }

    for (const accountKey of channel.accountKeys || []) {
      if (!accountKeys.has(accountKey)) {
        errors.push(`Unknown accountKey ${accountKey} for ${channel.channelKey}`);
      }
    }
  }

  return { ok:errors.length === 0, errors };
}

export function resolveRoute(config, clientChannelKey) {
  const validation = validateRoutingConfig(config);
  if (!validation.ok) {
    return {
      status:'BLOCK',
      reason:'Routing configuration is invalid.',
      errors:validation.errors,
      route:null
    };
  }

  const clientChannel = config.clientChannels.find(
    x => x.enabled !== false && x.channelKey === clientChannelKey
  );

  if (!clientChannel) {
    return {
      status:'BLOCK',
      reason:'Unknown or disabled client channel.',
      route:null
    };
  }

  const accounts = (clientChannel.accountKeys || [])
    .map(key => config.accounts.find(a => a.accountKey === key))
    .filter(Boolean);

  const providerChannel = config.providerChannels.find(
    x => x.enabled !== false && x.channelKey === clientChannel.providerChannelKey
  );

  if (!providerChannel || accounts.length === 0) {
    return {
      status:'BLOCK',
      reason:'Channel has no complete account/provider route.',
      route:null
    };
  }

  return {
    status:'OK',
    reason:'Route resolved.',
    route:{ clientChannel, accounts, providerChannel }
  };
}

export function routeAllowsRecord(route, record) {
  if (!route || !record) return false;

  const accountKeys = new Set(route.accounts.map(x => x.accountKey));
  if (record.accountKey && accountKeys.has(record.accountKey)) return true;

  const aliases = new Set(route.accounts.flatMap(x => x.externalAliases || []));
  return Boolean(record.accountAlias && aliases.has(record.accountAlias));
}
