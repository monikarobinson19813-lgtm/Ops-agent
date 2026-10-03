# Ops Agent

Ops Agent is a generic, read-only operations support engine for transaction-support teams.

V0.2 focuses on converting repetitive support conversations into a safe, reviewable workflow:

```text
client message
  -> intent classification
  -> authorised read-only lookup
  -> local answer OR upstream escalation draft
  -> common-incident detection where appropriate
  -> provider reply correlation
  -> client update draft
  -> operator triage / Command Center
  -> human approval
```

## V0.2 capabilities

- transaction status / trace / failure / proof / CNR intent handling;
- deterministic read-only escalation rules;
- case lifecycle and provider reply correlation;
- common queue/route incident detection;
- duplicate provider escalation suppression;
- incident recovery and health-backed closure rules;
- provider/client follow-up SLAs;
- P0-P3 operational triage;
- Command Center with search and focus filters;
- case and incident drill-down timelines;
- shadow-mode operator actions and approvals;
- local JSON audit/persistence;
- anonymized end-to-end acceptance scenarios.

## Command Center

Start the local demo UI:

```bash
npm run review
```

Open:

```text
http://127.0.0.1:8787/
```

Useful local routes:

- `/` — Command Center
- `/review` — approval queue
- `/detail?type=CASE&id=...` — case drill-down
- `/detail?type=INCIDENT&id=...` — incident drill-down

The local demo remains **shadow-only**. No external message is sent.

## Scenario simulator

Run the anonymized end-to-end acceptance scenarios:

```bash
npm run scenarios
```

Current scenarios cover local success, aged pending escalation, beneficiary non-receipt, common incident recovery, and unsafe/unmatched provider replies.

## Tests

Requires Node.js 20+.

```bash
npm test
```

GitHub Actions runs the anonymized regression suite for pull requests and `main`.

## Safety model

Ops Agent is designed for operational support, not financial execution.

This public reference implementation must not:

- initiate or retry payouts;
- modify beneficiaries;
- approve financial transactions;
- alter bank/provider routing;
- change provider configuration;
- bypass authentication or OTP controls;
- infer beneficiary receipt solely from a SUCCESS status;
- send externally without the configured human-review policy.

## Public repository boundary

This repository contains only generic source code, documentation and anonymized fixtures.

Never commit:

- credentials, passwords, OTPs, cookies, sessions or tokens;
- production panel URLs or live selectors;
- real merchant/customer/provider identifiers;
- real transaction/customer data;
- WhatsApp exports, phone numbers or group IDs;
- authenticated browser profiles;
- production screenshots, proofs or downloaded documents;
- private routing/account mappings.

Production-specific integration belongs in a private/local deployment layer.

## V0.2 freeze status

The generic V0.2 engine is feature-frozen for this milestone.

The acceptance criteria and remaining live-integration gates are documented in:

- `docs/V0_2_ACCEPTANCE.md`
- `docs/V0_2_RELEASE_NOTES.md`

The next phase is private/live integration: read-only panel adapter, authenticated session handling, WhatsApp transport/shadow pilot, and controlled production validation.
