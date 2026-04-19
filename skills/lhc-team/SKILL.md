---
name: lhc-team
description: Coordinates parallel Wix engineering lanes atop a saved plan via Task-tool subagent fan-out, then gates on peer review. Use when the plan cleanly splits into 2+ independent lanes and parallelism will reduce latency. Requires a plan in ~/.lhc/plans/.
when_to_use: A reviewed plan exists and cleanly decomposes into 2+ independent lanes; parallelism is worth the orchestration overhead.
---

# LHC Team

Multi-lane orchestration on top of a reviewed plan. Dispatches subagents per lane. Coordinates, synthesizes, and gates completion on peer review. The coordinating agent does not implement directly.

<Required_Reading>
- `../shared/read-only-governance.md`
- `../shared/peer-review-governance.md`
- `../shared/subagent-catalog.md`
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
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow team --source workflow --cwd "$PWD" --task "<plan-path>" --peer-review-required
   ```

2. **Partition the plan into lanes**. Typical shapes:
   - implementation lane(s) → `let-him-cook:executor`
   - verification lane → `let-him-cook:verifier`
   - docs / repo research lane → `let-him-cook:repo-cartographer`, `let-him-cook:internal-docs-researcher`
   - review lane → `let-him-cook:code-reviewer` + `peer-review.sh`

3. **Dispatch lanes in parallel** via `Task(...)`. Keep with the coordinating agent: lane selection, conflict resolution across lane outputs, final synthesis.

4. **Synthesize** per-lane outputs into the final diff + evidence package.

5. **Peer review** the final diff and synthesis via `peer-review.sh --mode code-review`.

6. **Save artifact** at `~/.lhc/artifacts/team-<slug>-<UTC-ISO>.md` — lane map, per-lane summary, aggregated files touched, verification evidence, peer-review verdict.

7. **Append to notepad** and STOP.

<Final_Checklist>
- [ ] Plan file existed before dispatch
- [ ] Each lane produced an explicit output
- [ ] Coordinating agent did not implement directly
- [ ] Verification evidence gathered
- [ ] Peer review recorded
- [ ] Team artifact saved under `~/.lhc/artifacts/`
</Final_Checklist>
