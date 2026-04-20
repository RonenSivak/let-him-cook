#!/usr/bin/env node

// Append a single-line entry to ~/.lhc/notepad.md in the LHC notepad schema.
// See skills/shared/notepad-schema.md for the format contract.
//
// Usage:
//   node write-notepad.js \
//     --workflow <name> \
//     --slug <kebab-slug> \
//     --cwd <path> \
//     [--kv key=value ...]
//
// Behavior:
//   - always UTC ISO-8601 timestamp
//   - tab-separated fields
//   - append-only, never truncates
//   - creates ~/.lhc/notepad.md if missing

const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);

function readFlag(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function readAllKv() {
  const pairs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--kv' && args[i + 1]) {
      pairs.push(args[i + 1]);
      i++;
    }
  }
  return pairs;
}

const workflow = readFlag('--workflow');
const slug = readFlag('--slug', 'unspecified');
const cwd = readFlag('--cwd', process.cwd());
const kvPairs = readAllKv();

if (!workflow) {
  console.error('write-notepad: --workflow is required');
  process.exit(1);
}

const validWorkflows = new Set([
  'interview', 'ralplan', 'ralph', 'team',
  'investigate', 'build-fix', 'research', 'review', 'status',
  'standards'
]);

if (!validWorkflows.has(workflow)) {
  console.error(`write-notepad: unknown workflow "${workflow}". Allowed: ${[...validWorkflows].join(', ')}`);
  process.exit(1);
}

const runtimeRoot = path.join(os.homedir(), '.lhc');
const notepadPath = path.join(runtimeRoot, 'notepad.md');
fs.mkdirSync(runtimeRoot, { recursive: true });

const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// Escape tabs and newlines in user-supplied fields to keep single-line schema.
function clean(s) {
  return String(s).replace(/[\t\n\r]+/g, ' ').trim();
}

const fields = [ts, workflow, clean(slug), clean(cwd), ...kvPairs.map(clean)];
const line = `- ${fields.join('\t')}\n`;

fs.appendFileSync(notepadPath, line, 'utf8');
process.stdout.write(line);
