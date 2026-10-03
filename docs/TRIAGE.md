# Ops Command Center triage

The triage queue answers one question:

**What should the operator look at next?**

## Priority inputs

The reference engine can consider:
- active common incidents;
- number of affected cases;
- overdue provider follow-ups;
- beneficiary non-receipt;
- high-value cases;
- confirmed client updates waiting to be sent;
- client evidence outstanding;
- case age;
- whether an individual case is already covered by an incident.

## Example priority bands

- P0 — immediate operational attention
- P1 — high priority
- P2 — normal operational work
- P3 — low urgency / routine

Scores and amount/time thresholds are configurable examples, not universal business rules.

## Important behavior

A transaction already linked to a common incident is slightly de-prioritized as an individual item. The operator should work the incident rather than repeatedly chase each affected transaction.

The queue always returns the reasons behind the score and a suggested next action, such as:
- CHASE_PROVIDER_INCIDENT
- SEND_CLIENT_UPDATE
- TRACE_OR_ESCALATE
- REQUEST_CLIENT_EVIDENCE
- FOLLOW_INCIDENT
- REVIEW_CASE

This is decision support for the operations team, not an automatic financial-action system.
