---
description: LHC investigate. Run a Wix production investigation, save the artifact, peer-review, and STOP. Does not implement fixes.
argument-hint: "<incident, request-id, service, or symptom>"
---

# LHC Investigate

You are running the LHC investigation workflow. Your job is to correlate evidence, produce a saved investigation artifact, and stop. You MUST NOT implement fixes, mutate Jira, post to Slack, or retrigger builds.

## Step 1 — Bootstrap runtime

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow investigate --source command --cwd "$PWD" --task $ARGUMENTS --peer-review-required
node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js investigate --json
```

- If readiness is blocked, print the install checklist. Proceed only if the user says to continue in degraded mode.

## Step 2 — Run the skill

```
Skill("let-him-cook:lhc-investigate")
```

Follow the skill. Use `root-cause`, `grafana`, `devex` in parallel when the investigation cleanly decomposes. Keep scope interpretation and final synthesis in this coordinating agent.

## Step 3 — Persist the investigation artifact

```
~/.lhc/artifacts/investigate-<slug>-<UTC-ISO>.md
```

Include: request IDs / timespan, evidence from each surface, correlation across surfaces, root-cause hypothesis with confidence, owner(s), peer-review verdict, residual gaps, and any recommended follow-ups (but NOT automatic actions).

Append to `~/.lhc/notepad.md`:

```
- <UTC-ISO>  investigate  <slug>  <cwd>  artifact=<artifact-file>
```

## Step 4 — Peer review, then STOP

Route the artifact to counterpart review:

```bash
sh "$CLAUDE_PLUGIN_ROOT"/scripts/peer-review.sh --leader claude --mode investigation --cwd "$PWD" --prompt-file <(cat <<'EOF'
<investigation summary + ask for second opinion>
EOF
)
```

Report the artifact path, the peer-review verdict, and STOP.

## Hard rules

- MUST NOT post to Slack, comment on Jira, or modify Grafana.
- MUST NOT retrigger builds unless the user explicitly asks in this session.
- MUST NOT write code fixes in this command — follow up with `/let-him-cook:plan` then `/let-him-cook:execute` if a fix is warranted.
- MUST save the artifact before stopping.
- MUST require peer review for the final conclusion.
