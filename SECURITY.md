# Security

This public repository must contain only generic source code, documentation, and anonymized test/demo data.

## Never commit

- production credentials or passwords;
- OTP/authentication codes;
- cookies, session storage, tokens or authenticated browser profiles;
- real merchant/customer/provider identifiers;
- phone numbers or private group/channel IDs;
- real transaction/customer data;
- raw chat exports;
- production panel URLs or live selectors;
- private account/routing mappings;
- production screenshots, proofs or downloaded documents.

If authentication material is accidentally committed, rotate/revoke it immediately and remove it from repository history before continuing.

## Runtime boundary

The reference engine is intended for **read-only operational support**.

Financial state-changing actions remain outside this public implementation, including payout initiation/retry, beneficiary changes, approvals, routing changes and provider configuration changes.

Authentication controls must not be bypassed. Passwords, OTPs, cookies and session tokens must not be passed to an AI model or committed to source control.

## Messaging boundary

V0.2 defaults to shadow/human-review workflows.

A drafted message is not evidence that it was sent. External send permissions must remain separately controlled, auditable and disabled by default in the public demo.

## Public/private split

Public:
- generic domain logic;
- anonymized fixtures/tests;
- local demo UI;
- documentation;
- CI.

Private/local deployment:
- live panel URL/selectors;
- authentication/session state;
- merchant/account mappings;
- messaging group/channel identifiers;
- production transaction data;
- deployment secrets and operational evidence.
