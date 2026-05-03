# LHC Quick Start

Install the `let-him-cook` plugin on Claude Code, Codex, Cursor, or any combination. Each flow takes under a minute and works against a local clone of this repo.

## Prerequisites

- **Node.js 18+** (the Codex and Cursor installers are Node scripts).
- **Claude Code 2.1+** (`claude --version`), **Codex CLI 0.128+** (`codex --version`), and/or **Cursor**. Upgrade Claude/Codex with `npm install -g @anthropic-ai/claude-code@latest` / `npm install -g @openai/codex@latest`.
- For peer review, both `claude` and `codex` should be on `PATH`. Cursor uses the same peer-review path — it shells out to whichever counterpart CLI is installed. Missing counterpart → review verdicts downgrade to `degraded`; nothing hard-fails.

## 1. Clone the repo

Place the clone wherever you like — both installers reference it by path, not by name.

```bash
git clone https://github.com/RonenSivak/let-him-cook.git ~/let-him-cook
cd ~/let-him-cook
```

## 2. Install on Claude Code

The repo is itself a Claude Code marketplace (`.claude-plugin/marketplace.json` declares the marketplace `let-him-cook-local` containing the plugin `let-him-cook`).

```bash
claude plugin marketplace add ~/let-him-cook
claude plugin install let-him-cook@let-him-cook-local
```

Verify:

```bash
claude plugin list | grep let-him-cook
# ❯ let-him-cook@let-him-cook-local
#   Status: ✔ enabled
```

Then start Claude Code and run `/lhc-status` — it bootstraps `~/.lhc/` and prints a per-workflow readiness snapshot.

## 3. Install on Codex

Codex (0.118+) wires plugins through `~/.agents/plugins/marketplace.json` and `~/.codex/config.toml`. Use the included installer; it symlinks the repo, writes the marketplace entry, and enables the plugin section.

```bash
cd ~/let-him-cook
node scripts/install-codex-plugin.js
```

The script:

- symlinks `~/.codex/plugins/let-him-cook` → this repo
- adds/updates `let-him-cook` in `~/.agents/plugins/marketplace.json`
- enables `[plugins."let-him-cook@ronensi-local"]` in `~/.codex/config.toml`

Preview before writing: `node scripts/install-codex-plugin.js --dry-run`.

Verify:

```bash
grep -E 'let-him-cook@ronensi-local' ~/.codex/config.toml
# [plugins."let-him-cook@ronensi-local"]
# enabled = true
```

Restart Codex, then run `/lhc-status` inside the session.

## 4. Install on Cursor

Cursor doesn't have Claude's plugin marketplace or Codex's plugin registry, so the installer wires the primitives directly: each LHC skill becomes a discoverable slash command, and runtime hooks bootstrap `~/.lhc/` on every prompt.

```bash
cd ~/let-him-cook
node scripts/install-cursor-plugin.js
```

The script:

- symlinks `~/.cursor/plugins/local/let-him-cook` → this repo
- symlinks each LHC skill into `~/.cursor/skills/<skill-name>/`
- merges LHC entries into `~/.cursor/hooks.json` (preserves any existing third-party hooks; LHC entries are tagged with `_origin: "lhc"` so re-running is idempotent)

Preview before writing: `node scripts/install-cursor-plugin.js --dry-run`.

Verify:

```bash
ls ~/.cursor/skills/ | grep lhc-
# lhc-build-fix, lhc-investigate, lhc-ralph, …
```

Restart Cursor, then invoke `/lhc-status` inside the chat panel.

To remove cleanly: `node scripts/install-cursor-plugin.js --uninstall` (drops only the LHC symlinks and hook entries, leaves the rest of your Cursor config alone).

> **Hook mapping note.** Cursor's hook events differ from Claude/Codex: `SessionStart` → `beforeSubmitPrompt` (fires on every prompt; the `runtime-touch.js` script is idempotent), `PreToolUse` → `beforeShellExecution`, `Stop` → `stop`. Cursor has no equivalent of `PreCompact`, so the working-agreements re-injection is currently a no-op there.

## 5. Updating

The Claude install caches the plugin contents under `~/.claude/plugins/cache/...`. The Codex and Cursor installs are symlinks to the live repo. So:

```bash
cd ~/let-him-cook
git pull

# Codex + Cursor pick up changes immediately (symlink). Restart the session.
# Claude Code needs a marketplace refresh:
claude plugin marketplace update let-him-cook-local
```

## 6. Troubleshooting

- **`Plugin … has an invalid manifest`** — the cached version drifted from a newer schema. Run `claude plugin marketplace update let-him-cook-local`, then `claude plugin update let-him-cook`.
- **`already points to <other path>`** from the Codex/Cursor installer — the target symlink already exists from a previous checkout. Move it aside (e.g. `mv ~/.codex/plugins/let-him-cook ~/.codex/plugins/let-him-cook.bak` or the equivalent under `~/.cursor/plugins/local/`) and re-run.
- **Cursor doesn't show LHC slash commands** — restart Cursor (it loads `~/.cursor/skills/` at startup). Confirm the symlinks exist with `ls ~/.cursor/skills/`.
- **Hooks don't fire / skills don't auto-trigger** — check for `DISABLE_LHC=1` or `LHC_SKIP_HOOKS=...` in your shell env. See [`README.md`](README.md#configuration) for the kill-switch reference.

## Next steps

- [`CHEATSHEET.md`](CHEATSHEET.md) — one-page reference of every skill, hook, and kill switch.
- [`FAQ.md`](FAQ.md) — common questions about peer review, workflows, runtime, and anti-patterns.
- [`README.md`](README.md) — full feature reference, hook contracts, runtime layout, and design principles.
