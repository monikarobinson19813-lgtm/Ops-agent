# Incident coordinator

The coordinator decides whether a new case should remain individual or join a common incident.

## Example progression

```text
Case 1, same route/account -> individual
Case 2, same route/account -> individual
Case 3, same route/account inside detection window
    -> create common incident
    -> suppress Case 3 individual provider escalation
    -> prepare one consolidated provider escalation

Case 4+
    -> link to existing incident
    -> suppress duplicate provider escalation
```

The example threshold is configurable.

## Provider escalation guard

Each incident tracks whether the consolidated provider escalation has already been sent/approved.

New linked cases do not automatically generate another upstream message.

A later re-escalation should be an explicit human decision, for example when:
- the incident materially worsens;
- the provider's promised recovery window is missed;
- a new route/provider dimension appears;
- the incident changes category.

## Provider updates

Provider updates can move the incident through states such as:
- ACKNOWLEDGED;
- MITIGATING;
- RECOVERING;
- RESOLVED.

Affected client drafts can then be generated consistently from the incident rather than independently per transaction.
