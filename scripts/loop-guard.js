#!/usr/bin/env node

// Loop guard: detects repeated (tool, args) invocations inside the active
// LHC workflow session and emits a strategy-switch signal when a hash
// repeats more than the threshold.
//
// Rationale: Columbia DAPLab's Nov 2025 taxonomy of 9 coding-agent failure
// patterns finds that agents "prioritize runnable code over correctness and
// repeatedly choose to suppress errors rather than communicating." Prompts
// alone do not stop loops (fixbrokenaiapps.com, whoffagents). The guard
// belongs in code, not in the prompt.
//
// Usage:
//   node loop-guard.js --record --tool <name> --args <json-or-string>
//   node loop-guard.js --check
//
// State: ~/.lhc/state/sessions/<sid>/tool-calls.jsonl (append-only hash log).
//
// Thresholds:
//   - same (tool, args) hash 3+ times  =>  warn: strategy-switch suggested
//   - same (tool, args) hash 5+ times  =>  signal: force-break required
//
// Kill switch: DISABLE_LHC=1 or LHC_SKIP_HOOKS=loop-guard => no-op.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);

function flag(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const skip = (process.env.LHC_SKIP_HOOKS || '').split(',').map(s => s.trim());
if (process.env.DISABLE_LHC === '1' || skip.includes('loop-guard')) {
  process.stdout.write(JSON.stringify({ status: 'disabled' }) + '\n');
  process.exit(0);
}

const mode = args.includes('--record') ? 'record' : args.includes('--check') ? 'check' : null;
if (!mode) {
  console.error('loop-guard: pass --record or --check');
  process.exit(1);
}

const sessionId =
  process.env.CODEX_SESSION_ID ||
  process.env.CLAUDE_SESSION_ID ||
  'no-session';

const sessionDir = path.join(os.homedir(), '.lhc', 'state', 'sessions', sessionId);
fs.mkdirSync(sessionDir, { recursive: true });
const logPath = path.join(sessionDir, 'tool-calls.jsonl');

if (mode === 'record') {
  const tool = flag('--tool');
  const raw = flag('--args');
  if (!tool) {
    console.error('loop-guard --record: --tool is required');
    process.exit(1);
  }
  const hash = crypto.createHash('sha1').update(`${tool}\0${raw}`).digest('hex').slice(0, 12);
  const entry = { at: new Date().toISOString(), tool, hash };
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  process.stdout.write(JSON.stringify({ status: 'recorded', hash }) + '\n');
  process.exit(0);
}

// mode === 'check'
if (!fs.existsSync(logPath)) {
  process.stdout.write(JSON.stringify({ status: 'clean', reason: 'no log' }) + '\n');
  process.exit(0);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
const counts = new Map();
for (const line of lines) {
  try {
    const e = JSON.parse(line);
    counts.set(e.hash, (counts.get(e.hash) || 0) + 1);
  } catch {}
}

let worst = { hash: null, count: 0 };
for (const [hash, count] of counts) {
  if (count > worst.count) worst = { hash, count };
}

let signal;
if (worst.count >= 5) signal = 'force-break';
else if (worst.count >= 3) signal = 'strategy-switch';
else signal = 'clean';

const output = {
  status: signal,
  worstHash: worst.hash,
  worstCount: worst.count,
  totalCalls: lines.length,
  distinctHashes: counts.size
};

if (signal !== 'clean') {
  output.message = signal === 'force-break'
    ? `[LHC loop-guard] Same tool call ${worst.count}× in this session — STOP. The approach is wrong. Return to lhc-ralplan or escalate to architect.`
    : `[LHC loop-guard] Same tool call ${worst.count}× in this session — change strategy. Three iterations of the same fix is the signal to stop, not to try harder.`;
}

process.stdout.write(JSON.stringify(output) + '\n');
process.exit(0);
