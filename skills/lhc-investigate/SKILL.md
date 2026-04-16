---
name: lhc-investigate
description: Investigate production issues using Wix operational surfaces while staying read-only by default.
---

# LHC Investigate

Use for production debugging, incident analysis, and request-ID-driven investigations.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/peer-review-governance.md`
- `../shared/wix-tool-surfaces.md`

## Workflow

1. Run readiness:

```bash
node ../../scripts/check-readiness.js investigate
```

2. Use:
   - `root-cause` for request-ID-based RCA
   - `grafana` for logs, metrics, traces, incidents, alerts, and on-call context
   - `devex` for build, release, rollout, and ownership correlation
3. Ensure local runtime exists before writing artifacts:

```bash
node ../../scripts/ensure-runtime.js
```

4. Save the investigation summary as a local artifact.
5. Get counterpart review before presenting the final incident conclusion.

## Guardrails

- no Slack posts
- no Jira mutations
- no Grafana writes
- no build retriggers

All external changes stay forbidden unless the user explicitly requests them.
