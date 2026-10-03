# Ops Agent

A generic, read-only operations workflow engine for support teams that need to:

- classify incoming support messages;
- look up transaction-like records through an external adapter;
- decide whether a case can be answered locally or needs escalation;
- correlate upstream/provider replies back to the correct open case;
- draft a safe client-facing update;
- keep a human approval step before anything is sent.

## Public-repo boundary

This repository intentionally contains **no production secrets or production data**.

Do not commit:
- credentials, authentication codes, cookies, session data or tokens;
- real customer/merchant identifiers;
- real chat exports;
- production panel URLs or selectors;
- live transaction data;
- private group/channel identifiers.

Use anonymized fixtures only.

## Safety model

The engine is designed for **read-only support workflows**.

It does not initiate or retry payouts, modify beneficiaries, alter routing, approve financial actions, or change provider configuration.

Suggested production flow:

```text
Client message
  -> intent parser
  -> scope/policy checks
  -> read-only lookup adapter
  -> local reply OR provider escalation draft
  -> human approval
  -> provider reply correlation
  -> client update draft
  -> human approval
```

## Run tests

Requires Node.js 20+.

```bash
npm test
```

## CI

GitHub Actions runs the anonymized test suite on pushes and pull requests to `main`.
