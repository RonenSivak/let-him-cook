#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const registryPath = path.join(__dirname, 'readiness-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const args = process.argv.slice(2);
const workflow = args.find((arg) => !arg.startsWith('--'));
const asJson = args.includes('--json');

if (!workflow) {
  console.error('Usage: node check-readiness.js <workflow> [--json]');
  process.exit(1);
}

const requirements = registry.workflowRequirements[workflow];

if (!requirements) {
  console.error(`Unknown workflow: ${workflow}`);
  process.exit(1);
}

function commandExists(command) {
  try {
    execFileSync('/bin/sh', ['-lc', `command -v ${command}`], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function parseMcpListOutput(output) {
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line)
    .filter(
      (line) => !line.startsWith('WARNING:') && !line.startsWith('Name ') && !line.startsWith('Checking ')
    )
    .map((line) => {
      // Codex format: "name  url..."  (name, then 2+ spaces)
      const codexMatch = line.match(/^([A-Za-z0-9._-]+)\s{2,}/);
      if (codexMatch) return codexMatch[1];
      // Claude Code format: "name: url..." or "plugin:<ns>:<name>: url..." or "claude.ai <name>: url..."
      const claudeMatch = line.match(/^(.+?):\s/);
      if (!claudeMatch) return null;
      const rawName = claudeMatch[1].trim();
      if (rawName.startsWith('plugin:')) {
        const parts = rawName.split(':');
        return parts[parts.length - 1];
      }
      // claude.ai built-ins don't participate in LHC readiness aliases
      if (rawName.startsWith('claude.ai ')) return null;
      return rawName;
    })
    .filter(Boolean);
}

function listMcpServersFromCli(cli) {
  try {
    const output = execFileSync(cli, ['mcp', 'list'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return parseMcpListOutput(output);
  } catch {
    return [];
  }
}

function listMcpServers() {
  const codexServers = listMcpServersFromCli('codex');
  const claudeServers = listMcpServersFromCli('claude');
  const merged = new Set([...codexServers, ...claudeServers]);
  return Array.from(merged);
}

const installedMcpServers = listMcpServers();
const availableCapabilities = new Set(installedMcpServers);

for (const server of installedMcpServers) {
  const aliases = registry.providerAliases[server];
  if (aliases) {
    for (const capability of aliases) {
      availableCapabilities.add(capability);
    }
  }
}

const missingMcp = requirements.mcp.filter((name) => !availableCapabilities.has(name));
const missingCli = requirements.cli.filter((name) => !commandExists(name));

const installChecklist = [];

for (const name of missingMcp) {
  if (['devex', 'grafana', 'root-cause', 'docs-schema', 'jira', 'slack'].includes(name)) {
    installChecklist.push(
      'Configure the Wix MCP gateway if it is missing (Codex): codex mcp add mcp-s --url https://mcp-s.wewix.net/mcp'
    );
    installChecklist.push(
      'Configure the Wix MCP gateway if it is missing (Claude Code): claude mcp add mcp-s --url https://mcp-s.wewix.net/mcp'
    );
    installChecklist.push('If authentication is required after adding it, run: codex mcp login mcp-s (or the Claude equivalent).');
    break;
  }

  if (name === 'octocode') {
    installChecklist.push('Install Octocode MCP if it is missing (Codex): codex mcp add octocode -- npx octocode-mcp@latest');
    installChecklist.push('Install Octocode MCP if it is missing (Claude Code): claude mcp add octocode -- npx octocode-mcp@latest');
  }

  if (name === 'context7') {
    installChecklist.push('Install Context7 MCP if it is missing (Codex): codex mcp add context7 -- npx -y @upstash/context7-mcp');
    installChecklist.push('Install Context7 MCP if it is missing (Claude Code): claude mcp add context7 -- npx -y @upstash/context7-mcp');
  }
}

for (const name of missingCli) {
  if (name === 'claude') {
    installChecklist.push('Install or configure the local Claude CLI, then verify with: claude --version');
  } else if (name === 'codex') {
    installChecklist.push('Install or configure the local Codex CLI, then verify with: codex --version');
  }
}

const report = {
  workflow,
  status: missingMcp.length || missingCli.length ? 'blocked' : 'ready',
  installedMcpServers,
  availableCapabilities: Array.from(availableCapabilities).sort(),
  requiredMcp: requirements.mcp,
  requiredCli: requirements.cli,
  missingMcp,
  missingCli,
  installChecklist
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.status === 'ready' ? 0 : 2);
}

const lines = [
  `Workflow: ${report.workflow}`,
  `Status: ${report.status}`,
  `Installed MCP servers: ${report.installedMcpServers.join(', ') || '(none found)'}`,
  `Required MCP capabilities: ${report.requiredMcp.join(', ') || '(none)'}`,
  `Required CLIs: ${report.requiredCli.join(', ') || '(none)'}`,
  `Missing MCP capabilities: ${report.missingMcp.join(', ') || '(none)'}`,
  `Missing CLIs: ${report.missingCli.join(', ') || '(none)'}`
];

if (report.installChecklist.length) {
  lines.push('Install checklist:');
  for (const item of report.installChecklist) {
    lines.push(`- ${item}`);
  }
}

process.stdout.write(`${lines.join('\n')}\n`);
process.exit(report.status === 'ready' ? 0 : 2);
