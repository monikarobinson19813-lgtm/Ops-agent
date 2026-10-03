# Ops Command Center view model

The Command Center turns raw operational state into a single operator-facing model.

## Sections

### Top priorities
A ranked cross-queue list of the highest-priority incidents and cases.

### Active incidents
Common route/provider/queue problems, including:
- affected case count;
- lifecycle state;
- whether the provider has been escalated;
- whether a provider follow-up is due;
- incident priority.

### Waiting provider
Individual cases waiting for upstream action.

Cases already covered by a common incident are marked `managedByIncident=true` so operators do not duplicate the incident workflow.

### Client updates ready
Cases with a confirmed provider response or prepared client update that should be reviewed and sent.

### Pending approvals
Shadow-mode client/provider drafts awaiting human decision.

## Command Center health

- CRITICAL: at least one P0 item
- ATTENTION: no P0, but at least one P1 item
- NORMAL: no P0/P1 items

The Command Center is a view model only. It does not send messages or perform financial actions.
