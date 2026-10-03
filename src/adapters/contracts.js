export class ReadOnlyLookupAdapter {
  async getRecordByReference(_scope, _reference) {
    throw new Error('Not implemented');
  }

  async getQueueHealth(_scope, _options = {}) {
    throw new Error('Not implemented');
  }
}

export class MessageTransportAdapter {
  async listRecentMessages(_channelId, _options = {}) {
    throw new Error('Not implemented');
  }

  async sendText(_channelId, _text, _options = {}) {
    throw new Error('Not implemented');
  }
}
