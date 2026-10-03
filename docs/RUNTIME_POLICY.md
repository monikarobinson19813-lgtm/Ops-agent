# Runtime send policy

The reference implementation defaults to **SHADOW_ONLY**.

External sending must be enabled explicitly in the deployment layer.

Even when external sending is enabled:
- high-risk cases remain blocked for human review;
- medium-risk cases require approval;
- provider escalations require approval by default;
- low-risk auto-send must be separately enabled;
- the deployment should expose an immediate kill switch.

Recommended production default:

```text
externalSendEnabled = false
allowLowRiskAutoSend = false
allowProviderAutoSend = false
```

Increase automation only after shadow-mode evidence meets the team's approved thresholds.
