---
name: lhc-team
description: Coordinate parallel Wix internal engineering lanes. Requires a saved plan. Dispatches subagents per lane and gates on peer review.
pipeline: [lhc-ralplan, lhc-team, lhc-review]
next-skill: lhc-review
handoff: ~/.lhc/artifacts/team-*.md
---

# LHC Team

Multi-lane orchestration on top of a reviewed plan. Dispatches subagents per lane. Coordinates, synthesizes, and gates completion on peer review. Does not implement in the coordinating agent.

## Required Reading

- `../shared/read-only-governance.md`
- `../shared/peer-review-governance.md`
- `../shared/subagent-catalog.md`

<Use_When>
- The saved plan cleanly splits into 2+ independent lanes.
- Parallelism will meaningfully reduce latency or context pressure.
- The task is large enough to warrant orchestration overhead.
</Use_When>

<Do_Not_Use_When>
- No plan file exists — run `/let-him-cook:plan` first.
- The task is small and sequential — use `lhc-ralph`.
- The task is investigation or research — use `lhc-investigate` or `lhc-research`.
</Do_Not_Use_When>

<Execution_Policy>
- MUST require a plan file in `~/.lhc/plans/`. If missing, STOP and tell the user.
- MUST keep external systems read-only unless the plan authorizes a specific write.
- MUST gate completion on BOTH verification evidence AND counterpart peer review.
- MUST save the team artifact at `~/.lhc/artifacts/team-<slug>-<UTC-ISO>.md`.
- The coordinating agent does NOT implement directly — it dispatches to `let-him-cook:executor` and other lane agents.
</Execution_Policy>

## Suggested Lane Shapes

1. **Initialize workflow state**

   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/runtime-touch.js --workflow team --source workflow --cwd "$PWD" --task "<plan-path>" --peer-review-required
   ```

2. **Partition the plan into lanes**
   - implementation lane(s) — `let-him-cook:executor`
   - evidence / verification lane — `let-him-cook:verifier`
   - docs / repo research lane — `let-him-cook:repo-cartographer`, `let-him-cook:internal-docs-researcher`
   - final review lane — `let-him-cook:code-reviewer` + `peer-review.sh`

3. **Dispatch lanes in parallel** via the Task tool. Keep these with the coordinating agent: lane selection, conflict resolution across lanes, final synthesis.

4. **Synthesize** per-lane outputs.

5. **Peer review** the final diff and synthesis.

6. **Save artifact and STOP.**

<Final_Checklist>
- [ ] Plan file existed before dispatch
- [ ] Each lane produced an explicit output
- [ ] Coordinating agent did not implement directly
- [ ] Verification evidence gathered
- [ ] Peer review recorded
- [ ] Team artifact saved under `~/.lhc/artifacts/`
</Final_Checklist>
