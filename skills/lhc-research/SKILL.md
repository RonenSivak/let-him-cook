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

1. Run readiness:

```bash
node ../../scripts/check-readiness.js research
```

2. Gather evidence from the highest-priority relevant source first.
3. Keep conclusions scoped to the evidence you actually found.
4. If the output becomes a major plan or formal conclusion, route it through counterpart review.
