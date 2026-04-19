---
description: LHC status. Print the current ~/.lhc runtime state — active workflow, recent artifacts, notepad tail, and readiness for each workflow.
---

# LHC Status

Read-only. Prints the state of `~/.lhc/` so the user knows what is in flight and which commands to run next.

## Steps

Run these and present the outputs in one concise block. Truncate any single section to ~20 lines.

```bash
node "$CLAUDE_PLUGIN_ROOT"/scripts/ensure-runtime.js --json
echo "--- runtime.json ---"
cat ~/.lhc/state/runtime.json 2>/dev/null || echo "(missing)"
echo "--- latest session ---"
ls -1t ~/.lhc/state/sessions 2>/dev/null | head -1 | xargs -I {} sh -c 'echo "session={}"; ls -1 ~/.lhc/state/sessions/{}'
echo "--- recent plans ---"
ls -1t ~/.lhc/plans 2>/dev/null | head -10
echo "--- recent artifacts ---"
ls -1t ~/.lhc/artifacts 2>/dev/null | head -10
echo "--- notepad (tail) ---"
tail -20 ~/.lhc/notepad.md 2>/dev/null || echo "(empty)"
echo "--- readiness ---"
for wf in interview ralplan ralph team investigate build-fix research review; do
  node "$CLAUDE_PLUGIN_ROOT"/scripts/check-readiness.js "$wf" --json 2>/dev/null \
    | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);console.log(`${o.workflow.padEnd(12)} ${o.status}${o.missingMcp.length?" missing="+o.missingMcp.join(","):""}`)}catch{console.log("??")}})'
done
```

Do not run any other command. Do not implement anything. Finish by suggesting the next `/let-him-cook:*` command based on what is (or isn't) in flight.
