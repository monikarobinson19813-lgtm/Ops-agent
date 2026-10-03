# Command Center search and focus

The Command Center should remain usable when the open queue becomes large.

The searchable index includes every open case and active incident, not only the top-priority subset.

Supported focus modes:
- ALL
- URGENT (P0/P1)
- CNR
- WAITING_PROVIDER
- CLIENT_UPDATES
- INCIDENTS
- APPROVALS

Priority filtering supports P0/P1/P2/P3.

Free-text search can match:
- case ID;
- transaction/reference;
- intent;
- state;
- incident ID;
- incident summary;
- next action.

This is a display/focus layer only and does not alter operational state.
