#!/bin/sh
set -eu

# stop-review-gate.sh — OPT-IN stop-time review gate for LHC.
#
# Pattern borrowed from openai/codex-plugin-cc/scripts/stop-review-gate-hook.mjs.
# Folded into LHC instead of being a standalone plugin; reuses
# scripts/peer-review.sh (the canonical bidirectional bridge) for the actual
# review and the same `## Verdict` envelope LHC already parses elsewhere.
#
# What it does (only when LHC_STOP_REVIEW_GATE=1):
#   1. Snapshots the working-tree diff.
#   2. Reads the last assistant message from hook stdin (best-effort).
#   3. Calls peer-review.sh in adversarial-stance mode.
#   4. Parses the `## Verdict` line:
#        approved | approved-with-changes  -> decision: allow
#        rejected                          -> decision: block (with reason)
#        degraded                          -> decision: allow (fail open on
#                                              infrastructure failure for an
#                                              opt-in gate; LHC's silent-degraded-
#                                              mode rule does NOT apply here
#                                              because the gate itself is opt-in
#                                              and the user already accepted that
#                                              counterpart unavailability degrades
#                                              the gate to a no-op)
#   5. Returns hook decision JSON to stdout: {"decision":"allow"|"block","reason":"..."}
#
# How to enable (add to your settings.json hooks, NOT auto-wired into LHC's hooks.json):
#
#   {
#     "hooks": {
#       "Stop": [{
#         "matcher": "*",
#         "hooks": [{
#           "type": "command",
#           "command": "LHC_STOP_REVIEW_GATE=1 sh \"${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-.}}\"/scripts/stop-review-gate.sh",
#           "timeout": 600
#         }]
#       }]
#     }
#   }
#
# Disable knobs:
#   LHC_STOP_REVIEW_GATE=0  (default — gate is no-op)
#   DISABLE_LHC=1           (treat all of LHC as absent — gate respects this)
#   LHC_SKIP_HOOKS=stop-review-gate  (disable just this hook)

PLUGIN_ROOT="${CODEX_PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}}"
STATE_DIR="$HOME/.lhc/state/stop-review-gate"
mkdir -p "$STATE_DIR"

emit() {
  decision="$1"
  reason="$2"
  esc_reason="$(printf '%s' "$reason" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
  printf '{"decision":"%s","reason":"%s"}\n' "$decision" "$esc_reason"
}

# 1. Respect LHC kill switches.
if [ "${DISABLE_LHC:-0}" = "1" ]; then
  emit "allow" "DISABLE_LHC=1"
  exit 0
fi

case ",${LHC_SKIP_HOOKS:-},"
in *,stop-review-gate,*)
  emit "allow" "LHC_SKIP_HOOKS contains stop-review-gate"
  exit 0
  ;;
esac

# 2. Gate is opt-in. Default = no-op (matches codex-plugin-cc default).
if [ "${LHC_STOP_REVIEW_GATE:-0}" != "1" ]; then
  emit "allow" "stop-review-gate not enabled (set LHC_STOP_REVIEW_GATE=1 to opt in)"
  exit 0
fi

# 3. Drain stdin (Claude Code / Codex hook payload). Best-effort extraction of
#    last_assistant_message; tolerant to missing field.
LAST_MSG=""
if [ ! -t 0 ]; then
  PAYLOAD="$(cat || true)"
  LAST_MSG="$(printf '%s' "$PAYLOAD" \
    | grep -oE '"last_assistant_message"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -n1 \
    | sed -E 's/.*"([^"]*)"$/\1/' \
    || true)"
fi

# 4. Snapshot the diff. No diff = nothing to review = allow.
DIFF_PATH="$STATE_DIR/.diff-$$.patch"
PROMPT_PATH="$STATE_DIR/.prompt-$$.txt"
trap 'rm -f "$DIFF_PATH" "$PROMPT_PATH"' EXIT

git diff > "$DIFF_PATH" 2>/dev/null || : > "$DIFF_PATH"
if [ ! -s "$DIFF_PATH" ]; then
  emit "allow" "no working-tree diff to review"
  exit 0
fi

# 5. Build the adversarial-stance prompt the counterpart will receive. The
#    same severity vocabulary (blocker|major|minor|nit) and the same
#    classification axes (anchor / fix / evidence) used by lhc-pr-review.
{
  cat <<'EOF'
You are a stop-time review gate. The LHC session is about to end. Your job
is to decide whether the work the agent claims is done is actually done.

Adversarial stance: do not verify the implementation works — question
whether this is the right implementation at all. For each non-trivial choice
in the diff, ask: why this approach over the obvious alternative, what
invariant makes this choice load-bearing, what edge case the author appears
confident about but did not test.

Bias toward approval. Block only when:
- The diff has a clear bug (compile error, missing import, broken control flow).
- The last assistant message claims tests pass but no test command appears
  in the diff or the recent shell activity.
- A file in the diff has unresolved merge conflict markers, debug
  console.log / print statements left in production paths, or hardcoded
  secrets.
- The acceptance criteria the user originally stated are demonstrably unmet.

Do NOT block for: style preferences, "I would have done this differently",
missing tests when the user did not ask for tests, refactor opportunities.

Use ordinal classification (severity = blocker|major|minor|nit; aggregate
self-check = verified|plausible|speculative). Drop findings whose self-check
is `speculative`.

Required response shape (the LHC peer-review envelope already enforces this):

## Verdict
approved | approved-with-changes | rejected | degraded

The stop-gate parses the Verdict line:
  approved or approved-with-changes -> session may stop.
  rejected                           -> session is blocked; agent must fix.
  degraded                           -> infrastructure failure; session may stop
                                        (the opt-in gate fails open).

EOF
  printf "LAST ASSISTANT MESSAGE:\n%s\n\n" "${LAST_MSG:-<none captured>}"
  printf "WORKING-TREE DIFF:\n"
  cat "$DIFF_PATH"
} > "$PROMPT_PATH"

# 6. Run counterpart adversarial review via the existing bidirectional bridge.
#    peer-review.sh auto-detects the leader (Claude->Codex, Codex->Claude) from
#    the plugin-root env vars and applies the read-only sandbox + envelope.
REVIEW_OUTPUT="$(
  sh "$PLUGIN_ROOT/scripts/peer-review.sh" \
    --mode analysis \
    --cwd "$PWD" \
    --prompt-file "$PROMPT_PATH" 2>/dev/null \
  || true
)"

# 7. Parse the `## Verdict` line.
VERDICT="$(printf '%s\n' "$REVIEW_OUTPUT" \
  | awk '/^## Verdict/{getline; print; exit}' \
  | tr '[:upper:]' '[:lower:]' \
  | tr -d '[:space:]' \
  || true)"

case "$VERDICT" in
  approved|approved-with-changes)
    emit "allow" "counterpart stop-gate review: $VERDICT"
    ;;
  rejected)
    # Surface the first 2-3 finding lines as the reason so the agent has
    # something concrete to act on.
    REASON="$(printf '%s\n' "$REVIEW_OUTPUT" \
      | awk '/^## Findings/{found=1; next} found && /^- /{print; n++; if (n>=3) exit}' \
      | tr '\n' ' ' \
      | sed 's/  */ /g' \
      || true)"
    [ -n "$REASON" ] || REASON="counterpart stop-gate review rejected the diff (see review output)"
    emit "block" "stop-gate: $REASON"
    ;;
  degraded)
    # Counterpart unavailable / strict-fallback failed. Opt-in gate fails open.
    emit "allow" "stop-gate degraded (counterpart unavailable); allowing stop"
    ;;
  *)
    # Unparseable verdict. Fail open with a note so the user can see the gate ran.
    emit "allow" "stop-gate verdict unparseable; allowing stop"
    ;;
esac
