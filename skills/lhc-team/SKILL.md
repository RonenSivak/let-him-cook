---
name: lhc-team
description: Coordinates parallel Wix engineering lanes atop a saved plan via Task-tool subagent fan-out, then gates on peer review. Use when the plan cleanly splits into 2+ independent lanes and parallelism will reduce latency. Requires a plan in ~/.lhc/plans/.
when_to_use: A reviewed plan exists and cleanly decomposes into 2+ independent lanes; parallelism is worth the orchestration overhead.
---

# LHC Team

Multi-lane orchestration on top of a reviewed plan. Dispatches subagents per lane. Coordinates, synthesizes, and gates completion on peer review. The coordinating agent does not implement directly.

<Iron_Law>
NO LANE MAY SPAWN LANES. Fan-out is flat — the coordinator is the only integrator. Subagents cannot call Task themselves.

NO EXECUTION WITHOUT A PLAN FILE. `lhc-team` requires a plan in `~/.lhc/plans/`. Inventing a plan inline is forbidden.

THE COORDINATOR DOES NOT IMPLEMENT. Dispatch to `executor` and other lane agents via `Task(...)`. Synthesize — do not write code from the coordinator seat.

LANE INDEPENDENCE MUST BE PROVEN, NOT ASSERTED. Before any fan-out, the plan must enumerate per-lane: what files each lane will touch, what shared state (if any) they read, what merge conflicts are possible. If two lanes touch the same files or depend on each other's outputs, they are NOT independent — run them serially in `lhc-ralph`. Evidence: Cognition "Don't Build Multi-Agents" (parallel agents make conflicting implicit decisions), Augment's post-mortem ("chained sub-agents for orientation/implementation/regression did NOT work"), SWE-bench Verified G6 (single-agent, 73.2%) beats G7 (multi-agent, 62.2%) on identical scaffolds.

DEFAULT TO SERIAL. If in doubt whether lanes are independent, refuse fan-out and route to `lhc-ralph`. Parallelism is a performance optimization, not a capability. Evidence: the replicated SWE-bench result that single-threaded scaffolds beat multi-agent ones on identical budget.

See `../shared/iron-laws.md` for all invariants and `../shared/rationalization-guard.md` for the thoughts that lead around them.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/rationalization-guard.md`
- `../shared/read-only-governance.md`
- `../shared/peer-review-governance.md`
- `../shared/handoff-protocol.md`
- `../shared/subagent-catalog.md`
- `../shared/notepad-schema.md`
- `../shared/commit-trailers.md`
</Required_Reading>

<Use_When>
- A saved plan cleanly splits into 2+ independent lanes.
- Parallelism will meaningfully reduce latency or context pressure.
- The task is large enough to warrant the orchestration overhead.
</Use_When>

<Do_Not_Use_When>
- No plan file exists — run `lhc-ralplan` first.
- The task is small and sequential — use `lhc-ralph`.
- The task is investigation or research — use `lhc-investigate` or `lhc-research`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST require a plan file in `~/.lhc/plans/`. If missing, STOP and tell the user to invoke `lhc-ralplan`.
- MUST keep external systems read-only unless the plan authorizes a specific write.
- MUST gate completion on BOTH verification evidence AND counterpart peer review.
- MUST save the team artifact at `~/.lhc/artifacts/team-<slug>-<UTC-ISO>.md`.
- The coordinating agent does NOT implement directly — it dispatches to `executor` and other lane agents via `Task(...)`.
- Subagents cannot spawn subagents — keep the fan-out flat.
</Execution_Policy>

## Workflow

1. **Initialize workflow state**
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/runtime-touch.js --workflow team --source workflow --cwd "$PWD" --task "<plan-path>" --peer-review-required
   ```

2. **Write the independence proof** (inline, before any fan-out). For each candidate lane enumerate:
   - files it will touch (exact paths)
   - shared state it reads (none is best)
   - merge conflicts possible with other lanes
   - whether its output blocks another lane's input

   If any two lanes share files or depend on each other, STOP the fan-out and invoke `lhc-ralph` instead. The default is serial.

3. **Partition into lanes** only after the independence proof passes. Typical shapes:
   - implementation lane(s) → `let-him-cook:executor`
   - verification lane → `let-him-cook:verifier`
   - docs / repo research lane → `let-him-cook:repo-cartographer`, `let-him-cook:internal-docs-researcher`
   - review lane → `let-him-cook:code-reviewer` + `peer-review.sh`

4. **Dispatch lanes in parallel** via `Task(...)`. Keep with the coordinating agent: lane selection, conflict resolution across lane outputs, final synthesis. Cap at 4 parallel lanes — beyond that, serialize.

5. **Synthesize** per-lane outputs into the final diff + evidence package.

6. **Peer review** the final diff and synthesis — use the background-bash pattern (see `../shared/peer-review-governance.md`):
   ```
   git diff | head -600 > /tmp/lhc-team-diff.txt
   Bash(
     command: "sh \"${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}\"/scripts/peer-review.sh --mode code-review --cwd \"$PWD\" --prompt-file /tmp/lhc-team-diff.txt",
     run_in_background: true,
     timeout: 600000
   )
   → poll BashOutput until "## Verdict" appears.
   ```

7. **Save artifact** at `~/.lhc/artifacts/team-<slug>-<UTC-ISO>.md` — lane map, independence proof, per-lane summary, aggregated files touched, verification evidence, peer-review verdict.

8. **Append to notepad** (use the helper — never hand-format)
   ```bash
   node "${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"/scripts/write-notepad.js \
     --workflow team --slug "<slug>" --cwd "$PWD" \
     --kv plan="<plan-path>" --kv artifact="<team-artifact-path>" --kv verdict="<approved|approved-with-changes|rejected|degraded>"
   ```

9. **Print the handoff block and STOP** (format defined in `../shared/handoff-protocol.md`):
   ```
   LHC HANDOFF
   - Completed: team
   - Slug: <slug>
   - Cwd: <pwd>
   - Artifact: <team-artifact-path>
   - Plan: <plan-path>
   - Verdict: <approved|approved-with-changes|rejected|degraded>
   ```

   Team is terminal — the user takes the diff from here.

<Final_Checklist>
- [ ] Plan file existed before dispatch
- [ ] Independence proof written (files, shared state, merge conflicts, blocking relationships)
- [ ] Fan-out did not exceed 4 parallel lanes
- [ ] Each lane produced an explicit output
- [ ] Coordinating agent did not implement directly
- [ ] Verification evidence gathered
- [ ] Peer review recorded
- [ ] Team artifact saved under `~/.lhc/artifacts/`
</Final_Checklist>
