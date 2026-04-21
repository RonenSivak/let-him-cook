#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN_NAME = 'let-him-cook';
const DEFAULT_MARKETPLACE = 'ronensi-local';
const DEFAULT_DISPLAY_NAME = 'Ronensi Local Plugins';
const DEFAULT_CATEGORY = 'Productivity';

function usage() {
  console.log(`Usage: node scripts/install-codex-plugin.js [options]

Install this repo as a local Codex plugin by wiring:
- ~/.codex/plugins/${PLUGIN_NAME}
- ~/.agents/plugins/marketplace.json
- ~/.codex/config.toml

Options:
  --dry-run                         Print the planned changes without writing them
  --mode <symlink|copy>             Install mode (default: symlink)
  --home <path>                     Override the target home directory (default: current HOME)
  --marketplace <name>              Marketplace identifier (default: ${DEFAULT_MARKETPLACE})
  --marketplace-display-name <name> Marketplace display name (default: "${DEFAULT_DISPLAY_NAME}")
  -h, --help                        Show this help
`);
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    mode: 'symlink',
    home: os.homedir(),
    marketplace: DEFAULT_MARKETPLACE,
    marketplaceDisplayName: DEFAULT_DISPLAY_NAME,
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
      case '--marketplace':
        options.marketplace = argv[++i];
        break;
      case '--marketplace-display-name':
        options.marketplaceDisplayName = argv[++i];
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

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath, options, actions) {
  actions.push(`ensure dir ${dirPath}`);
  if (!options.dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeTextFile(filePath, content, options, actions) {
  actions.push(`write ${filePath}`);
  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

function installPluginRoot(repoRoot, installPath, options, actions) {
  const codexPluginsDir = path.dirname(installPath);
  ensureDir(codexPluginsDir, options, actions);

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

function updateMarketplace(marketplacePath, options, actions) {
  const sourcePath = `./.codex/plugins/${PLUGIN_NAME}`;
  const nextEntry = {
    name: PLUGIN_NAME,
    source: {
      source: 'local',
      path: sourcePath,
    },
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
    },
    category: DEFAULT_CATEGORY,
  };

  const existing = readJsonIfExists(marketplacePath) || {};
  const marketplace = {
    name: existing.name || options.marketplace,
    interface: {
      ...(existing.interface || {}),
      displayName: (existing.interface && existing.interface.displayName) || options.marketplaceDisplayName,
    },
    plugins: Array.isArray(existing.plugins) ? existing.plugins.slice() : [],
  };

  const index = marketplace.plugins.findIndex(plugin => plugin && plugin.name === PLUGIN_NAME);
  if (index === -1) {
    marketplace.plugins.push(nextEntry);
  } else {
    marketplace.plugins[index] = nextEntry;
  }

  const content = `${JSON.stringify(marketplace, null, 2)}\n`;
  writeTextFile(marketplacePath, content, options, actions);
}

function updateConfig(configPath, pluginKey, options, actions) {
  const sectionHeader = `[plugins."${pluginKey}"]`;
  const nextSection = `${sectionHeader}\nenabled = true\n`;
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';

  let updated = current;
  const headerIndex = current.indexOf(sectionHeader);

  if (headerIndex === -1) {
    updated = current.trimEnd();
    updated = updated ? `${updated}\n\n${nextSection}` : nextSection;
  } else {
    const rest = current.slice(headerIndex + sectionHeader.length);
    const nextSectionOffset = rest.search(/\n\[/);
    const sectionEnd = nextSectionOffset === -1 ? current.length : headerIndex + sectionHeader.length + nextSectionOffset + 1;
    const section = current.slice(headerIndex, sectionEnd);
    let replacement = section;

    if (/^\s*enabled\s*=.*$/m.test(section)) {
      replacement = section.replace(/^\s*enabled\s*=.*$/m, 'enabled = true');
    } else {
      replacement = `${section.trimEnd()}\nenabled = true\n`;
    }

    updated = `${current.slice(0, headerIndex)}${replacement}${current.slice(sectionEnd)}`;
  }

  if (updated !== current) {
    writeTextFile(configPath, `${updated.trimEnd()}\n`, options, actions);
  } else {
    actions.push(`keep existing config section ${pluginKey}`);
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const options = parseArgs(process.argv.slice(2));
  const actions = [];

  const installPath = path.join(options.home, '.codex', 'plugins', PLUGIN_NAME);
  const marketplacePath = path.join(options.home, '.agents', 'plugins', 'marketplace.json');
  const configPath = path.join(options.home, '.codex', 'config.toml');
  const pluginKey = `${PLUGIN_NAME}@${options.marketplace}`;

  installPluginRoot(repoRoot, installPath, options, actions);
  updateMarketplace(marketplacePath, options, actions);
  updateConfig(configPath, pluginKey, options, actions);

  const modeLabel = options.dryRun ? 'dry-run' : 'installed';
  console.log(`[codex-plugin] ${modeLabel} ${PLUGIN_NAME}`);
  for (const action of actions) {
    console.log(`- ${action}`);
  }
  console.log('- restart Codex after installation so the plugin registry is reloaded');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[codex-plugin] ${error.message}`);
    process.exit(1);
  }
}
