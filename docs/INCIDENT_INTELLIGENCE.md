# Incident intelligence

Repeated transaction complaints should not automatically create repeated upstream escalations.

## Detection

A common incident candidate may be created when several open cases share:
- the same provider channel;
- the same account scope;
- the same route/bank/provider dimension when available;
- incident-like symptoms such as PENDING / PROCESSING / QUEUED;
- a short observation window.

Example only:

```text
3+ related pending cases in 10 minutes
        ↓
candidate QUEUE_DELAY incident
```

Those values are configurable examples, not universal production thresholds.

## Escalation suppression

If an active incident already covers a new case:
- link the case to the incident;
- do not create another identical provider escalation;
- keep the original case visible for client follow-up.

## Consolidated provider escalation

Instead of sending 20 separate messages, create one provider draft containing:
- affected case count;
- oldest pending age;
- status distribution;
- a small set of sample references;
- concise observed issue.

## Client updates

An incident can produce one consistent update per affected client channel.

Each resulting client update remains human-reviewed in shadow mode.

## Isolation

Never cluster cases merely because they occurred at the same time.

Provider channel, account scope and route/bank/provider dimensions should remain compatible before cases are grouped.
