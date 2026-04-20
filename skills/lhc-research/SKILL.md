---
name: lhc-research
description: Researches internal Wix patterns via docs-schema, octocode, and context7 (for external deps), saves findings to ~/.lhc/artifacts/research-*.md. Use when the user asks "how does X work at Wix", "what pattern does Wix use for Y", or "which service owns Z". Does not implement or modify code.
when_to_use: The user has a knowledge question about internal Wix systems, docs, APIs, or repo patterns. The goal is understanding, not a code change.
---

# LHC Research

"How does this work at Wix?" "What's the right internal pattern?" "Which service or doc explains this?" — this skill answers from internal sources and saves the answer as an artifact.

<Iron_Law>
NO CLAIM WITHOUT A SOURCE. Every non-trivial claim cites a doc URL, repo path, or PR ref. Quote the grounding passage when possible. Speculation is labeled speculation.

NO EXTRAPOLATION. Conclusions stay scoped to evidence actually found. If a question cannot be answered from internal sources, say so explicitly — do not guess.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/readiness-and-degraded-mode.md`
- `../shared/notepad-schema.md`
- `../shared/wix-tool-surfaces.md`
</Required_Reading>

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
- Source priority: `docs-schema` → `octocode` → `context7` (only for external dependencies). Pull from the highest-priority relevant source first.
- Optional live surface: `grafana-datasource` — when the question is "what events does service X actually emit in prod?" or "which schema is in use right now?", `query_bi_events` / `query_panorama` answer from ground truth instead of docs. Treat as supporting, not primary; still cite every claim.
- MUST save the research artifact at `~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md`.
- MUST keep conclusions scoped to evidence actually found. No extrapolating.
- MUST NOT edit repo files.
- Every non-trivial claim gets a source (doc URL, repo path, PR ref, or datasource query + response shape). Quote the passage that grounds the claim when possible.
- If the research turns into a formal conclusion or plan, route through `lhc-review` for counterpart peer review.
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

3. **Decompose** into 1-3 evidence lanes:
   - internal docs and schemas
   - repo and PR archaeology
   - framework/standards guidance

4. **Dispatch subagents in parallel** when lanes are independent:
   - `Task(subagent_type="let-him-cook:internal-docs-researcher", …)`
   - `Task(subagent_type="let-him-cook:repo-cartographer", …)`
   - `Task(subagent_type="let-him-cook:framework-standards-reviewer", …)`

5. **Gather evidence** from the highest-priority relevant source first. Each subagent returns: what it checked, key findings with quoted passages, caveats, source families.

6. **Synthesize** — the coordinating agent reconciles conflicts and writes the final answer.

7. **Save artifact** at `~/.lhc/artifacts/research-<slug>-<UTC-ISO>.md`. Include question, answer, evidence with links + one-line quote per claim, caveats, and an explicit "not verified" list for anything that could not be grounded.

8. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/write-notepad.js \
     --workflow research --slug "<slug>" --cwd "$PWD" \
     --kv artifact="<artifact-path>"
   ```
   Then STOP.

<Final_Checklist>
- [ ] Artifact saved under `~/.lhc/artifacts/`
- [ ] At least one internal source cited (docs-schema or octocode) when the question is Wix-specific
- [ ] Quoted passages per claim where available
- [ ] Caveats and "not verified" items explicit
- [ ] No source file was modified
</Final_Checklist>
