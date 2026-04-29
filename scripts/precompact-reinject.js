#!/usr/bin/env node

// PreCompact hook: emits a hookSpecificOutput JSON that re-injects the LHC
// working agreements just before the harness compacts the conversation.
// Without this, the agent forgets the read-only defaults and peer-review
// gates when the older turns get summarised away.
//
// Idempotent, read-only. Runs in <50ms.

const message = [
  '[LHC working agreements — do not forget across compaction]',
  '',
  '1. Read-only by default: no Jira writes, no Slack posts, no PR comments,',
  '   no Grafana mutations, no build retriggers unless the user explicitly',
  '   authorized the specific write in this session.',
  '2. Counterpart peer review is mandatory for plans, diffs, investigations,',
  '   and incident conclusions. Self-approval in the same context is forbidden.',
  '   Use scripts/peer-review.sh to route to the counterpart model. If the',
  '   counterpart CLI is missing, token/quota-limited, rate-limited,',
  '   timed out, crashed, or returned an unparseable verdict, use the',
  '   strict separate-context fallback and record degraded counterpart',
  '   coverage.',
  '3. Runtime state lives under ~/.lhc/ (plans/, artifacts/, notepad.md,',
  '   state/). Every workflow artifact is saved before stopping.',
  '4. Readiness first. Blocked readiness hard-stops unless the user opts',
  '   into degraded mode in the same turn.',
  '5. lhc-ralph requires an existing plan file. Inline plan invention is',
  '   forbidden.',
  '6. Confidence after exhaustion: lhc-research, lhc-investigate, and',
  '   lhc-standards must not emit medium/low confidence until they record',
  '   exhausted or blocked evidence paths.',
  '7. Three failed iterations of the same fix = stop and question the plan.',
  '   Do not attempt fix #4.',
  '',
  'Full contract: AGENTS.md (Codex) / CLAUDE.md (Claude) at the plugin root. Invariants: skills/shared/iron-laws.md.'
].join('\n');

const payload = {
  hookSpecificOutput: {
    hookEventName: 'PreCompact',
    additionalContext: message
  }
};

// Kill switch: respect LHC_SKIP_HOOKS=precompact,... and DISABLE_LHC=1
const skip = (process.env.LHC_SKIP_HOOKS || '').split(',').map(s => s.trim());
if (process.env.DISABLE_LHC === '1' || skip.includes('precompact')) {
  process.stdout.write(JSON.stringify({}) + '\n');
  process.exit(0);
}

process.stdout.write(JSON.stringify(payload) + '\n');
