# Architecture

## Purpose

Ops Agent is a transport-agnostic, read-only support workflow engine.

It separates:

1. message transport;
2. intent parsing;
3. account/scope policy;
4. read-only record lookup;
5. escalation decisioning;
6. case and incident state;
7. upstream reply correlation;
8. client-safe response drafting;
9. human approval.

## Reference flow

```text
Client channel
   |
   v
Intent parser
   |
   v
Scope/policy guard
   |
   v
Read-only lookup adapter
   |------------------------|
   |                        |
Resolved locally        Needs upstream
   |                        |
   v                        v
Client draft          Provider draft
   |                        |
   +------> Human approval <+
                            |
                            v
                      Provider reply
                            |
                            v
                      Correlation engine
                            |
                            v
                     Client-safe update
                            |
                            v
                       Human approval
```

## Important boundaries

The language model, if one is added later, should not:
- receive credentials or authenticated session material;
- choose arbitrary account scope;
- bypass deterministic scope checks;
- perform financial state-changing actions;
- treat a successful system status as proof of beneficiary receipt.

## Adapter design

`ReadOnlyLookupAdapter` provides transaction/queue information.

`MessageTransportAdapter` abstracts the messaging platform.

Business rules should not depend on a specific browser, dashboard, messaging vendor, or provider.
