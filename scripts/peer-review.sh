#!/bin/sh
set -eu

show_help() {
  printf '%s\n' \
    'Usage: sh peer-review.sh --leader <codex|claude> --mode <code-review|plan|investigation|conclusion|analysis> [--cwd <dir>] [--prompt-file <file>]' \
    '' \
    'Reads the review prompt from --prompt-file or stdin and routes the task to the counterpart model.'
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

if [ "$LEADER" = "codex" ]; then
  if ! command -v claude >/dev/null 2>&1; then
    echo "Claude CLI is required for counterpart review. Verify with: claude --version" >&2
    exit 2
  fi

  claude -p "$PROMPT"
  exit 0
fi

if [ "$LEADER" = "claude" ]; then
  if ! command -v codex >/dev/null 2>&1; then
    echo "Codex CLI is required for counterpart review. Verify with: codex --version" >&2
    exit 2
  fi

  if [ "$MODE" = "code-review" ] && [ -n "$CWD" ]; then
    codex review --title "WIXx peer review" "$PROMPT"
    exit 0
  fi

  if [ -n "$CWD" ]; then
    codex exec --skip-git-repo-check -C "$CWD" "$PROMPT"
  else
    codex exec --skip-git-repo-check "$PROMPT"
  fi
  exit 0
fi

echo "Unsupported leader: $LEADER" >&2
exit 1
