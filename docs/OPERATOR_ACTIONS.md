# Operator actions

The detail screen can create shadow-mode work without contacting external systems.

Supported actions:
- draft provider follow-up;
- draft confirmed client update;
- draft client evidence request.

Each action:
1. validates the current case/incident state;
2. creates a proposed message;
3. checks for an equivalent pending approval to avoid duplicate drafts;
4. records an audit event;
5. leaves final SEND/EDIT/IGNORE to the human approval screen.

No action in this layer changes payout state, retries a transaction, modifies routing, or sends an external message.
