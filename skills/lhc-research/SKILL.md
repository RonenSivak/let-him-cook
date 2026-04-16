---
name: lhc-research
description: Research internal Wix patterns, docs, APIs, and repos with the right source priority.
---

# LHC Research

Use for questions such as:

- how does this work at Wix
- what is the right internal pattern
- which internal service or doc explains this behavior

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/wix-tool-surfaces.md`

## Source Priority

1. internal docs and schemas via `docs-schema`
2. internal repo and PR archaeology via `octocode`
3. external library docs via `context7` only when the question is really about an external dependency

## Workflow

1. Initialize workflow state:

```bash
node ../../scripts/runtime-touch.js --workflow research --source workflow --phase starting
```

2. Run readiness:

```bash
node ../../scripts/check-readiness.js research
```

3. Classify the request into 1 to 3 evidence lanes. Typical lanes:
   - internal docs and schemas
   - repo and PR archaeology
   - framework or standards guidance
4. If two or more lanes are independent, dispatch native subagents in parallel so the main agent keeps framing and synthesis in context.
5. Good subagent candidates:
   - `internal-docs-researcher` for `docs-schema`-heavy lookups
   - `repo-cartographer` for `octocode` repo and PR archaeology
   - `framework-standards-reviewer` for guidance and standards checks
6. Keep these steps with the coordinating agent:
   - scope interpretation
   - lane selection
   - conflict resolution across evidence
   - final synthesis for the user
7. Each research subagent should return:
   - what it checked
   - key findings
   - caveats
   - source families used
8. Gather evidence from the highest-priority relevant source first.
9. Keep conclusions scoped to the evidence you actually found.
10. If the output becomes a major plan or formal conclusion, route it through counterpart review.
