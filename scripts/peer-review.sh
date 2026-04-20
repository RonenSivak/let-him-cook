#!/bin/sh
set -eu

# Enable Anthropic's 1-hour prompt cache for peer-review calls unless the caller
# opted out. Cross-model review is highly cache-friendly (review prompts repeat
# structure; diffs share prefixes). See Claude Code CHANGELOG for
# ENABLE_PROMPT_CACHING_1H. No-op on Codex-side; Claude side gets the savings.
: "${ENABLE_PROMPT_CACHING_1H:=1}"
export ENABLE_PROMPT_CACHING_1H

show_help() {
  printf '%s\n' \
    'Usage: sh peer-review.sh --leader <codex|claude> --mode <code-review|plan|investigation|conclusion|analysis> [--cwd <dir>] [--prompt-file <file>]' \
    '' \
    'Reads the review prompt from --prompt-file or stdin and routes the task to the counterpart model.' \
    '' \
    'Environment:' \
    '  ENABLE_PROMPT_CACHING_1H=0   disable 1-hour prompt cache (default 1)'
}

LEADER=""
MODE="analysis"
CWD=""
PROMPT_FILE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --leader)
      LEADER="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --cwd)
      CWD="$2"
      shift 2
      ;;
    --prompt-file)
      PROMPT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      show_help >&2
      exit 1
      ;;
  esac
done

if [ -n "$PROMPT_FILE" ]; then
  PROMPT="$(cat "$PROMPT_FILE")"
else
  PROMPT="$(cat)"
fi

if [ -z "$LEADER" ]; then
  echo "Missing --leader" >&2
  exit 1
fi

# Mirror all reviewer output to a tail-able log so callers can stream progress
# in another terminal (tail -f) or via the Claude Code Monitor tool, instead of
# blocking on a silent foreground call for 30-90s. LHC_PEER_REVIEW_NO_LOG=1
# disables the tee for callers that need pristine stdout.
LOG_PATH=""
if [ "${LHC_PEER_REVIEW_NO_LOG:-0}" != "1" ]; then
  LOG_DIR="${LHC_PEER_REVIEW_LOG_DIR:-$HOME/.lhc/logs/peer-review}"
  mkdir -p "$LOG_DIR"
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  LOG_PATH="$LOG_DIR/${MODE}-${TS}-$$.log"
  {
    echo "# LHC peer-review log"
    echo "# leader: $LEADER"
    echo "# mode:   $MODE"
    echo "# cwd:    ${CWD:-<unset>}"
    echo "# prompt: ${PROMPT_FILE:-<stdin>}"
    echo "# start:  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "# tail:   tail -f $LOG_PATH"
    echo "# ---"
  } >"$LOG_PATH"
  echo "[peer-review] streaming to: $LOG_PATH" >&2
fi

# stream() runs the reviewer command with line-buffered stdout+stderr merged
# into the log while still returning them on stdout. When LOG_PATH is empty
# (opt-out), it just runs the command.
stream() {
  if [ -n "$LOG_PATH" ]; then
    "$@" 2>&1 | tee -a "$LOG_PATH"
  else
    "$@"
  fi
}

if [ "$LEADER" = "codex" ]; then
  if ! command -v claude >/dev/null 2>&1; then
    echo "Claude CLI is required for counterpart review. Verify with: claude --version" >&2
    exit 2
  fi

  stream claude -p "$PROMPT"
  exit 0
fi

if [ "$LEADER" = "claude" ]; then
  if ! command -v codex >/dev/null 2>&1; then
    echo "Codex CLI is required for counterpart review. Verify with: codex --version" >&2
    exit 2
  fi

  if [ "$MODE" = "code-review" ] && [ -n "$CWD" ]; then
    stream codex review --title "LHC peer review" "$PROMPT"
    exit 0
  fi

  if [ -n "$CWD" ]; then
    stream codex exec --skip-git-repo-check -C "$CWD" "$PROMPT"
  else
    stream codex exec --skip-git-repo-check "$PROMPT"
  fi
  exit 0
fi

echo "Unsupported leader: $LEADER" >&2
exit 1
