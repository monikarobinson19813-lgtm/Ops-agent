# Shadow mode

Shadow mode is the recommended first deployment stage.

The engine may:
- read an incoming message;
- perform an authorised read-only lookup;
- classify the case;
- prepare a client reply or provider escalation;
- correlate a provider reply;
- prepare a client update.

It should **not send automatically**.

A reviewer chooses:
- SEND;
- EDIT;
- IGNORE;
- ESCALATE;
- LINK TO INCIDENT;
- CLOSE.

Track:
- lookup accuracy;
- correlation accuracy;
- reviewer edit rate;
- reviewer ignore rate;
- false-positive response rate;
- unresolved/ambiguous cases;
- time saved.

Only consistently accurate, low-risk, read-only scenarios should later be considered for selective auto-send.
