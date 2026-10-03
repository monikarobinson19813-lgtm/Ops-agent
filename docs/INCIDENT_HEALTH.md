# Incident health and closure

A common incident should not close merely because one upstream message says "resolved".

Use live operational health where available.

## Example health inputs

- current pending count;
- oldest pending age;
- recent successful processing count;
- number of new complaints.

## Resolution logic

Strong closure:
- provider indicates resolved; and
- live metrics are within clear thresholds.

Partial recovery:
- queue is shrinking;
- processing movement is visible;
- pending age/count are improving.

Still degraded:
- pending queue remains elevated;
- oldest pending remains high;
- new complaints continue.

Human operators may explicitly override lifecycle state when external evidence is stronger than the available metrics.

All numerical thresholds are deployment configuration, not universal defaults.
