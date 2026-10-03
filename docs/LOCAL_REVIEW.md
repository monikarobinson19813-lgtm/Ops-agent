# Local shadow review

The public demo includes a local-only review screen.

Run:

```bash
npm run review
```

Then open:

```text
http://127.0.0.1:8787
```

The screen displays anonymized demo approval cards and supports:
- SEND;
- EDIT + APPROVE;
- IGNORE;
- ESCALATE;
- CLOSE.

In this public demo, those actions only update local state under `.data/review-state`. No external messaging service is connected.

Delete `.data/review-state` to reset the demo fixtures.
