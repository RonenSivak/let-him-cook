#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);

function readFlag(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const kind = readFlag('--kind');
const slug = readFlag('--slug');
const title = readFlag('--title', 'LHC Artifact');
const task = readFlag('--task');
const prompt = readFlag('--prompt');
const summary = readFlag('--summary');
const confidence = readFlag('--confidence', 'unspecified');
const missingCoverage = readFlag('--missing-coverage', 'none');

if (!kind || !slug) {
  console.error('Usage: node write-artifact.js --kind <kind> --slug <slug> [--title ...] [--task ...] [--prompt ...] [--summary ...]');
  process.exit(1);
}

const rawOutput = fs.readFileSync(0, 'utf8');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(os.homedir(), '.lhc', 'artifacts');
const artifactPath = path.join(artifactDir, `${kind}-${slug}-${timestamp}.md`);

fs.mkdirSync(artifactDir, { recursive: true });

const body = [
  `# ${title}`,
  '',
  `- Kind: ${kind}`,
  `- Slug: ${slug}`,
  `- Created: ${new Date().toISOString()}`,
  `- Confidence: ${confidence}`,
  `- Missing coverage: ${missingCoverage}`,
  '',
  '## Original Task',
  '',
  task || '(not provided)',
  '',
  '## Final Prompt Or Context Sent',
  '',
  prompt || '(not provided)',
  '',
  '## Raw Result',
  '',
  '```text',
  rawOutput.trimEnd(),
  '```',
  '',
  '## Summary',
  '',
  summary || '(not provided)',
  ''
].join('\n');

fs.writeFileSync(artifactPath, `${body}\n`, 'utf8');
process.stdout.write(`${artifactPath}\n`);
