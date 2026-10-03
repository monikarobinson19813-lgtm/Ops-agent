# Automation readiness metrics

Do not turn on automatic sending simply because the demo works.

Measure shadow-mode evidence first.

## Core metrics

- lookup accuracy;
- provider-reply correlation accuracy;
- reviewer edit rate;
- reviewer ignore rate;
- escalation rate;
- average case resolution time.

## Example readiness thresholds

The library includes conservative **example** thresholds only. They are not universal business rules.

A production team should set its own thresholds based on risk tolerance, case volume and observed error modes.

Suggested approach:
1. collect a meaningful shadow-mode sample;
2. review every mismatch/incorrect lookup;
3. fix recurring causes;
4. repeat measurement;
5. consider auto-send only for narrowly defined low-risk intents;
6. retain a kill switch and audit history.

High-risk or ambiguous cases should remain human-reviewed regardless of aggregate metrics.
