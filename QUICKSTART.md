# LHC Quick Start

Install the `let-him-cook` plugin on Claude Code, Codex, or both. Each flow takes under a minute and works against a local clone of this repo.

## Prerequisites

- **Node.js 18+** (the Codex installer is a Node script).
- **Claude Code 2.x** (`claude --version`) and/or **Codex CLI 0.118+** (`codex --version`).
- For peer review, the *other* CLI must also be on `PATH`. Missing counterpart → review verdicts downgrade to `degraded`; nothing hard-fails.

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

Codex 0.118 wires plugins through `~/.agents/plugins/marketplace.json` and `~/.codex/config.toml`. Use the included installer; it symlinks the repo, writes the marketplace entry, and enables the plugin section.

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

## 4. Updating

The Claude install caches the plugin contents under `~/.claude/plugins/cache/...`. The Codex install is a symlink to the live repo. So:

```bash
cd ~/let-him-cook
git pull

# Codex picks up changes immediately (symlink). Restart the session.
# Claude Code needs a marketplace refresh:
claude plugin marketplace update let-him-cook-local
```

## 5. Troubleshooting

- **`Plugin … has an invalid manifest`** — the cached version drifted from a newer schema. Run `claude plugin marketplace update let-him-cook-local`, then `claude plugin update let-him-cook`.
- **`already points to <other path>`** from the Codex installer — `~/.codex/plugins/let-him-cook` already exists from a previous checkout. Move it aside (`mv ~/.codex/plugins/let-him-cook ~/.codex/plugins/let-him-cook.bak`) and re-run.
- **Hooks don't fire / skills don't auto-trigger** — check for `DISABLE_LHC=1` or `LHC_SKIP_HOOKS=...` in your shell env. See [`README.md`](README.md#configuration) for the kill-switch reference.

## Next steps

- [`CHEATSHEET.md`](CHEATSHEET.md) — one-page reference of every skill, hook, and kill switch.
- [`FAQ.md`](FAQ.md) — common questions about peer review, workflows, runtime, and anti-patterns.
- [`README.md`](README.md) — full feature reference, hook contracts, runtime layout, and design principles.
