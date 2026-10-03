# End-to-end scenario simulator

The scenario simulator replays anonymized operational situations through the actual domain engine.

Current scenarios cover:
1. local SUCCESS response;
2. aged PENDING escalation;
3. SUCCESS + beneficiary non-receipt/CNR;
4. common queue incident creation and recovery;
5. provider wording that cannot be safely correlated.

Each scenario carries explicit expectations.

Run:

```bash
npm run scenarios
```

A failing expectation exits non-zero, so the same scenarios can act as acceptance tests.

The simulator uses no network calls, credentials, live customer data, WhatsApp transport, or production panel access.
