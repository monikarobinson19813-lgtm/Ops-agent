# Provider replies for common incidents

Provider replies about a common incident are handled separately from single-transaction replies.

## Correlation signals

Prefer deterministic evidence:
1. quoted incident ID;
2. incident ID in message;
3. one or more affected transaction references;
4. route/bank/provider dimension;
5. incident-type symptoms such as queue/pending/route language.

If two incidents score equally, require human review.

## Lifecycle interpretation

Examples:

- "checking / bank-side issue identified" -> ACKNOWLEDGED
- "queue reducing / recovery started" -> RECOVERING
- "issue fixed / normal now" -> RESOLVED
- "still slow / issue continues" -> MITIGATING

Unknown wording remains review-required.

## Safety

Do not close an incident only because one individual transaction succeeds.

Incident resolution should be supported by a provider update, live operational metrics, or both.
