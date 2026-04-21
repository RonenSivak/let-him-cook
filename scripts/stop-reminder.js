#!/usr/bin/env node

// Stop hook: emits a short reminder if the active LHC workflow expects
// a peer-review gate and no review artifact has been recorded yet.
//
// Read-only: inspects ~/.lhc/state/sessions/<sid>/ to decide whether to
// nudge. Silent in the common case. Kill switch via DISABLE_LHC / LHC_SKIP_HOOKS.

const fs = require('fs');
const os = require('os');
const path = require('path');

function emit(output) {
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
}

const skip = (process.env.LHC_SKIP_HOOKS || '').split(',').map(s => s.trim());
if (process.env.DISABLE_LHC === '1' || skip.includes('stop')) emit({});

const sessionsRoot = path.join(os.homedir(), '.lhc', 'state', 'sessions');
if (!fs.existsSync(sessionsRoot)) emit({});

// Find the most-recently-touched session directory.
let latestDir = null;
let latestMtime = 0;
for (const name of fs.readdirSync(sessionsRoot)) {
  const full = path.join(sessionsRoot, name);
  try {
    const st = fs.statSync(full);
    if (st.isDirectory() && st.mtimeMs > latestMtime) {
      latestMtime = st.mtimeMs;
      latestDir = full;
    }
  } catch {}
}
if (!latestDir) emit({});

// Look at workflow state files in that session.
const files = fs.readdirSync(latestDir).filter(f => f.endsWith('.json'));
const pending = [];
for (const f of files) {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(latestDir, f), 'utf8'));
    if (
      state.active &&
      state.peer_review_required &&
      state.peer_review_status === 'required'
    ) {
      pending.push(state.workflow);
    }
  } catch {}
}

if (!pending.length) emit({});

const workflows = [...new Set(pending)].join(', ');
const message = [
  `[LHC reminder] Stopping with unfinished peer-review gates: ${workflows}.`,
  '',
  'Run:',
  '  LHC_PLUGIN_ROOT="${CODEX_PLUGIN_ROOT:-$CLAUDE_PLUGIN_ROOT}"',
  '  sh "$LHC_PLUGIN_ROOT"/scripts/peer-review.sh --mode <mode> --prompt-file <file>',
  '',
  'Or mark the workflow as abandoned explicitly. Silent skipping leaves a',
  'stale peer_review_status=required on ~/.lhc/state/sessions/<sid>/.'
].join('\n');

emit({
  hookSpecificOutput: {
    hookEventName: 'Stop',
    additionalContext: message
  }
});
