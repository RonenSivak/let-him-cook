#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN_NAME = 'let-him-cook';
const HOOK_ORIGIN = 'lhc';

function usage() {
  console.log(`Usage: node scripts/install-cursor-plugin.js [options]

Install this repo as a local Cursor plugin by wiring:
- ~/.cursor/plugins/local/${PLUGIN_NAME}        (symlink to repo)
- ~/.cursor/skills/<skill-name>                  (symlink per LHC skill)
- ~/.cursor/hooks.json                           (LHC entries merged in)

Cursor doesn't have Claude's plugin marketplace or Codex's plugin registry,
so this script wires the same primitives directly: skills become discoverable
slash commands, and the runtime hooks bootstrap ~/.lhc/ on every prompt.

Options:
  --dry-run                Print the planned changes without writing them
  --mode <symlink|copy>    Install mode (default: symlink)
  --home <path>            Override the target home directory (default: HOME)
  --uninstall              Remove all LHC entries (skill links + hook entries)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    mode: 'symlink',
    home: os.homedir(),
    uninstall: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--mode':
        options.mode = argv[++i];
        break;
      case '--home':
        options.home = path.resolve(argv[++i]);
        break;
      case '--uninstall':
        options.uninstall = true;
        break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!['symlink', 'copy'].includes(options.mode)) {
    throw new Error(`Unsupported --mode value: ${options.mode}`);
  }

  return options;
}

function ensureDir(dirPath, options, actions) {
  actions.push(`ensure dir ${dirPath}`);
  if (!options.dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listSkills(skillsRoot) {
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'shared')
    .map(entry => entry.name);
}

function installPluginRoot(repoRoot, installPath, options, actions) {
  ensureDir(path.dirname(installPath), options, actions);

  if (fs.existsSync(installPath)) {
    const stat = fs.lstatSync(installPath);
    if (stat.isSymbolicLink()) {
      const currentTarget = fs.realpathSync(installPath);
      if (currentTarget === repoRoot) {
        actions.push(`keep existing symlink ${installPath} -> ${repoRoot}`);
        return;
      }
      throw new Error(`${installPath} already points to ${currentTarget}. Move it aside before reinstalling.`);
    }
    throw new Error(`${installPath} already exists and is not a symlink. Move it aside before using the installer.`);
  }

  if (options.mode === 'symlink') {
    actions.push(`symlink ${installPath} -> ${repoRoot}`);
    if (!options.dryRun) {
      fs.symlinkSync(repoRoot, installPath, 'dir');
    }
    return;
  }

  actions.push(`copy ${repoRoot} -> ${installPath}`);
  if (!options.dryRun) {
    fs.cpSync(repoRoot, installPath, { recursive: true });
  }
}

function installSkillLink(repoSkillPath, targetPath, options, actions) {
  if (fs.existsSync(targetPath)) {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      const currentTarget = fs.realpathSync(targetPath);
      if (currentTarget === repoSkillPath) {
        actions.push(`keep skill ${targetPath}`);
        return;
      }
      actions.push(`replace skill symlink ${targetPath} -> ${repoSkillPath}`);
      if (!options.dryRun) {
        fs.unlinkSync(targetPath);
        fs.symlinkSync(repoSkillPath, targetPath, 'dir');
      }
      return;
    }
    throw new Error(`${targetPath} exists and is not a symlink — move it aside before installing.`);
  }

  actions.push(`symlink skill ${targetPath} -> ${repoSkillPath}`);
  if (!options.dryRun) {
    fs.symlinkSync(repoSkillPath, targetPath, 'dir');
  }
}

function removeSkillLink(targetPath, options, actions) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.lstatSync(targetPath);
  if (!stat.isSymbolicLink()) {
    actions.push(`skip non-symlink ${targetPath}`);
    return;
  }
  actions.push(`remove skill symlink ${targetPath}`);
  if (!options.dryRun) {
    fs.unlinkSync(targetPath);
  }
}

function buildHookEntries(installPath) {
  const runtimeTouch = `node "${installPath}"/scripts/runtime-touch.js --source cursor-prompt --cwd "$PWD" >/dev/null 2>&1 || true`;
  const pretoolBootstrap = `sh "${installPath}"/scripts/pretool-runtime-bootstrap.sh >/dev/null 2>&1 || true`;
  const stopReminder = `node "${installPath}"/scripts/stop-reminder.js >/dev/null 2>&1 || true`;

  return {
    beforeSubmitPrompt: { _origin: HOOK_ORIGIN, command: runtimeTouch },
    beforeShellExecution: { _origin: HOOK_ORIGIN, command: pretoolBootstrap },
    stop: { _origin: HOOK_ORIGIN, command: stopReminder },
  };
}

function readHooksFile(hooksPath) {
  if (!fs.existsSync(hooksPath)) {
    return { version: 1, hooks: {} };
  }
  const raw = fs.readFileSync(hooksPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.hooks || typeof parsed.hooks !== 'object') {
    parsed.hooks = {};
  }
  return parsed;
}

function stripLhcEntries(hooks) {
  for (const [event, list] of Object.entries(hooks)) {
    if (!Array.isArray(list)) continue;
    hooks[event] = list.filter(entry => entry && entry._origin !== HOOK_ORIGIN);
    if (hooks[event].length === 0) {
      delete hooks[event];
    }
  }
}

function mergeHooks(hooksPath, installPath, options, actions) {
  const config = readHooksFile(hooksPath);
  stripLhcEntries(config.hooks);

  const lhcEntries = buildHookEntries(installPath);
  for (const [event, entry] of Object.entries(lhcEntries)) {
    if (!Array.isArray(config.hooks[event])) {
      config.hooks[event] = [];
    }
    config.hooks[event].push(entry);
  }

  const content = `${JSON.stringify(config, null, 2)}\n`;
  actions.push(`write ${hooksPath} (LHC entries merged)`);
  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
    fs.writeFileSync(hooksPath, content);
  }
}

function unmergeHooks(hooksPath, options, actions) {
  if (!fs.existsSync(hooksPath)) {
    actions.push(`skip ${hooksPath} (not present)`);
    return;
  }
  const config = readHooksFile(hooksPath);
  stripLhcEntries(config.hooks);
  const content = `${JSON.stringify(config, null, 2)}\n`;
  actions.push(`write ${hooksPath} (LHC entries removed)`);
  if (!options.dryRun) {
    fs.writeFileSync(hooksPath, content);
  }
}

function runInstall(repoRoot, options, actions) {
  const pluginInstallPath = path.join(options.home, '.cursor', 'plugins', 'local', PLUGIN_NAME);
  const skillsRoot = path.join(options.home, '.cursor', 'skills');
  const hooksPath = path.join(options.home, '.cursor', 'hooks.json');

  installPluginRoot(repoRoot, pluginInstallPath, options, actions);
  ensureDir(skillsRoot, options, actions);

  const skills = listSkills(path.join(repoRoot, 'skills'));
  for (const skill of skills) {
    const repoSkillPath = path.join(repoRoot, 'skills', skill);
    const targetPath = path.join(skillsRoot, skill);
    installSkillLink(repoSkillPath, targetPath, options, actions);
  }

  mergeHooks(hooksPath, pluginInstallPath, options, actions);
}

function runUninstall(repoRoot, options, actions) {
  const pluginInstallPath = path.join(options.home, '.cursor', 'plugins', 'local', PLUGIN_NAME);
  const skillsRoot = path.join(options.home, '.cursor', 'skills');
  const hooksPath = path.join(options.home, '.cursor', 'hooks.json');

  if (fs.existsSync(pluginInstallPath) && fs.lstatSync(pluginInstallPath).isSymbolicLink()) {
    actions.push(`remove plugin symlink ${pluginInstallPath}`);
    if (!options.dryRun) {
      fs.unlinkSync(pluginInstallPath);
    }
  } else if (fs.existsSync(pluginInstallPath)) {
    actions.push(`skip plugin path ${pluginInstallPath} (not a symlink — manual cleanup needed)`);
  }

  const skills = listSkills(path.join(repoRoot, 'skills'));
  for (const skill of skills) {
    removeSkillLink(path.join(skillsRoot, skill), options, actions);
  }

  unmergeHooks(hooksPath, options, actions);
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const options = parseArgs(process.argv.slice(2));
  const actions = [];

  if (options.uninstall) {
    runUninstall(repoRoot, options, actions);
  } else {
    runInstall(repoRoot, options, actions);
  }

  const verb = options.uninstall ? 'uninstall' : 'install';
  const modeLabel = options.dryRun ? `dry-run ${verb}` : `${verb}ed`;
  console.log(`[cursor-plugin] ${modeLabel} ${PLUGIN_NAME}`);
  for (const action of actions) {
    console.log(`- ${action}`);
  }
  if (!options.uninstall) {
    console.log('- restart Cursor so the new skills and hooks are picked up');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[cursor-plugin] ${error.message}`);
    process.exit(1);
  }
}
