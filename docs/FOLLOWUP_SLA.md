# Follow-up and SLA intelligence

The engine should surface stale operational work instead of relying on memory.

## Typical follow-up queues

- provider response overdue for an individual case;
- provider update overdue for a common incident;
- client evidence/bank statement still outstanding;
- confirmed provider response waiting too long for a client update.

## Thresholds

All timing values are deployment configuration.

The library provides example defaults only.

## Shadow-mode behavior

A due follow-up creates a review item/draft. It does not send automatically.

This is especially important for provider chasing: the system should avoid repetitive automated messages when a human may already be handling the conversation.
