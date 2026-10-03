import { ReadOnlyLookupAdapter } from './contracts.js';

const RECORDS = new Map([
  ['TX10001', {
    reference:'TX10001',
    clientReference:'ORDER-DEMO-1',
    amount:85000,
    status:'SUCCESS',
    traceId:'TRACE-DEMO-10001',
    createdAt:'2026-10-03T12:00:00.000Z',
    processedAt:'2026-10-03T12:00:08.000Z'
  }],
  ['TX10002', {
    reference:'TX10002',
    clientReference:'ORDER-DEMO-2',
    amount:42000,
    status:'PROCESSING',
    traceId:null,
    createdAt:'2026-10-03T12:00:00.000Z',
    processedAt:null
  }],
  ['TX10003', {
    reference:'TX10003',
    clientReference:'ORDER-DEMO-3',
    amount:15000,
    status:'FAILED',
    traceId:null,
    createdAt:'2026-10-03T12:00:00.000Z',
    processedAt:'2026-10-03T12:00:03.000Z',
    failureReason:'Demo provider rejection'
  }]
]);

export class MockLookupAdapter extends ReadOnlyLookupAdapter {
  async getRecordByReference(_scope, reference) {
    const value = RECORDS.get(String(reference || '').toUpperCase());
    return value ? structuredClone(value) : null;
  }

  async getQueueHealth() {
    return {
      pendingCount:7,
      oldestPendingMinutes:3,
      knownIncident:false
    };
  }
}
