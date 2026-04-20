---
name: lhc-status
description: Prints a read-only snapshot of ~/.lhc state — runtime, recent plans/artifacts, notepad tail, and per-workflow readiness. Use when the user asks "what's in ~/.lhc", "what plans do I have", "lhc status", or before starting a new workflow.
when_to_use: The user wants a picture of current LHC state or needs a recommendation for which LHC skill to invoke next.
---

# LHC Status

Read-only. Prints the state of `~/.lhc/` so the user knows what is in flight and which LHC skill to invoke next.

<Iron_Law>
READ-ONLY. Never modifies anything under `~/.lhc/` except via the idempotent `ensure-runtime.js` bootstrap.

See `../shared/iron-laws.md` for all invariants.
</Iron_Law>

<Required_Reading>
- `../shared/iron-laws.md`
- `../shared/notepad-schema.md`
- `../../docs/runtime-contract.md`
</Required_Reading>

<Use_When>
- The user asks "what's in `~/.lhc/`", "what plans do I have", or "status".
- The user wants a recommendation for which LHC skill to run next given current state.
- Before starting a new workflow, to confirm nothing is already in flight.
</Use_When>

<Do_Not_Use_When>
- The user has a concrete workflow request — run the matching LHC skill directly.
- The user wants to change anything — this skill is strictly read-only.
</Do_Not_Use_When>

<Execution_Policy>
- MUST run `ensure-runtime.js` first so the report is never based on a missing runtime.
- MUST NOT modify any file under `~/.lhc/` except via the bootstrap script.
- MUST keep each section of the report tight — truncate any single listing to ~20 lines.
- MUST end with a concrete recommendation for the next LHC skill based on observed state.
</Execution_Policy>

## Workflow

1. **Bootstrap runtime**
   ```bash
   node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
   ```

2. **Collect runtime state**
   ```bash
   cat ~/.lhc/state/runtime.json
   ls -1t ~/.lhc/state/sessions | head -1
   ```

3. **List recent plans and artifacts**
   ```bash
   ls -1t ~/.lhc/plans 2>/dev/null | head -10
   ls -1t ~/.lhc/artifacts 2>/dev/null | head -10
   ```

4. **Tail the notepad**
   ```bash
   tail -20 ~/.lhc/notepad.md
   ```

5. **Readiness per workflow**
   ```bash
   for wf in interview ralplan ralph team investigate build-fix research review; do
     node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js "$wf" --json 2>/dev/null \
       | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);console.log(`${o.workflow.padEnd(12)} ${o.status}${o.missingMcp.length?" missing="+o.missingMcp.join(","):""}`)}catch{console.log("??")}})'
   done
   ```

6. **Synthesize and recommend the next skill** — close with a single-line recommendation, e.g.:
   - "No plan in flight — invoke `lhc-ralplan` to start one."
   - "Plan `<path>` waiting — invoke `lhc-ralph` to execute."
   - "Recent investigation `<path>` awaiting review — invoke `lhc-review`."

<Final_Checklist>
- [ ] Runtime root exists and was bootstrapped (even if it already existed)
- [ ] Report covered runtime state, plans, artifacts, notepad tail, and readiness
- [ ] No file under `~/.lhc/` was modified outside of bootstrap
- [ ] Final line recommends a concrete next skill
</Final_Checklist>
