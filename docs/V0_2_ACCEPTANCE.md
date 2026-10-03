# V0.2 acceptance checklist

Status: **GENERIC ENGINE FEATURE-FROZEN**

This checklist covers the public/generic V0.2 milestone only. It does not certify a live production deployment.

## Core transaction workflow

- [x] Classify transaction status, trace, failure, proof and beneficiary non-receipt requests.
- [x] Keep read-only lookup behind an adapter contract.
- [x] Distinguish local reply, provider escalation and human review.
- [x] Avoid claiming beneficiary receipt from system SUCCESS alone.
- [x] Correlate provider replies back to the relevant case.
- [x] Draft client updates for human review.

## Incident workflow

- [x] Detect repeated compatible pending/route symptoms.
- [x] Create a common incident after configurable thresholds.
- [x] Attach later matching cases to the active incident.
- [x] Suppress duplicate provider escalations.
- [x] Consolidate provider escalation context.
- [x] Correlate provider incident replies.
- [x] Track acknowledged / mitigating / recovering / resolved lifecycle.
- [x] Prevent closure when provider wording conflicts with degraded operational metrics.
- [x] Keep client-channel updates isolated.

## Operations workflow

- [x] Detect overdue provider/client follow-ups.
- [x] Rank open work using P0-P3 triage.
- [x] Expose priority reasons and next actions.
- [x] Command Center scorecards and focus filters.
- [x] Search every open case/active incident by reference or operational context.
- [x] Case/incident drill-down with timeline.
- [x] Shadow-mode operator actions.
- [x] Duplicate draft protection.
- [x] Human approval queue and audit events.

## Test/acceptance coverage

- [x] Unit/regression suites wired into `npm test`.
- [x] Anonymized end-to-end scenario simulator.
- [x] Scenario command exits non-zero on expectation failure.
- [x] Public GitHub CI enabled.
- [x] Public-boundary sanity scan found no known real provider/merchant/project identifiers in the PR diff.

## Explicitly outside this milestone

These are private/live integration gates and remain intentionally incomplete in the public repo:

- [ ] production panel URL/selectors;
- [ ] real authenticated panel session;
- [ ] manual OTP/session lifecycle proof;
- [ ] live read-only panel adapter;
- [ ] real merchant/account/channel routing;
- [ ] WhatsApp transport;
- [ ] production shadow pilot;
- [ ] measured live lookup/correlation accuracy;
- [ ] selective auto-send decision after sufficient shadow evidence.

## Freeze rule

Changes after this point should be one of:

1. regression/security fixes;
2. documentation corrections;
3. private/live adapter work outside the public generic core;
4. an explicitly approved V0.3 feature.
