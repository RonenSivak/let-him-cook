---
name: lhc-research
description: Research internal Wix patterns, docs, APIs, and repos with the right source priority. Saves a research artifact and STOPS. Does not implement.
pipeline: [lhc-research]
next-skill: none
handoff: ~/.lhc/artifacts/research-*.md
---

# LHC Research

"How does this work at Wix?" "What's the right internal pattern?" "Which service or doc explains this?" This skill answers research questions from internal sources and saves the answer as an artifact.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/wix-tool-surfaces.md`

<Use_When>
- The user asks "how does X work", "what pattern does Wix use for Y", or "which service owns Z".
- The answer lives in internal docs, schemas, or repo history.
- The goal is understanding, not a code change.
</Use_When>

<Do_Not_Use_When>
- The user wants a code change — use `lhc-ralplan` then `lhc-ralph`.
- The user is debugging a prod issue — use `lhc-investigate`.
- The user is failing a build — use `lhc-build-fix`.
</Do_Not_Use_When>

<Execution_Policy>
- Source priority: `docs-schema` → `octocode` → `context7` (only for external dependencies).
- MUST save the research artifact at `~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md`.
- MUST keep conclusions scoped to evidence actually found.
- MUST NOT edit repo files.
- If the research turns into a formal conclusion or a plan, route through the `lhc-review` skill for counterpart review.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow research --source workflow --cwd "$PWD" --task "<question>"
   ```

2. **Run readiness**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js research --json
   ```

3. **Classify the request** into 1-3 evidence lanes:
   - internal docs and schemas
   - repo and PR archaeology
   - framework or standards guidance

4. **Dispatch subagents in parallel** when lanes are independent:
   - `let-him-cook:internal-docs-researcher` (docs-schema)
   - `let-him-cook:repo-cartographer` (octocode)
   - `let-him-cook:framework-standards-reviewer` (standards)

5. **Gather evidence** from the highest-priority relevant source first. Each subagent returns: what it checked, key findings, caveats, source families.

6. **Synthesize** — coordinating agent reconciles conflicts and writes the final answer.

7. **Save artifact** at `~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md`. Include question, answer, evidence with links, caveats, explicit "not verified" items.

8. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] Evidence cites at least one internal source (docs-schema or octocode) when the question is Wix-specific
- [ ] Caveats and "not verified" items explicit
- [ ] No source file was modified
</Final_Checklist>
