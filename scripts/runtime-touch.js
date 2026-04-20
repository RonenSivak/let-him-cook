#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);

function readFlag(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const workflow = readFlag('--workflow');
const source = readFlag('--source', 'workflow');
const cwd = readFlag('--cwd', process.cwd());
const task = readFlag('--task', '');
const phase = readFlag('--phase', 'starting');
const peerReviewRequired = args.includes('--peer-review-required');

const runtimeRoot = path.join(os.homedir(), '.lhc');
const stateRoot = path.join(runtimeRoot, 'state');
const sessionsRoot = path.join(stateRoot, 'sessions');
const runtimeStatePath = path.join(stateRoot, 'runtime.json');
const activityLogPath = path.join(stateRoot, 'activity.jsonl');

execFileSync(process.execPath, [path.join(__dirname, 'ensure-runtime.js')], {
  stdio: 'ignore'
});

const timestamp = new Date().toISOString();
const sessionId =
  process.env.CODEX_SESSION_ID ||
  process.env.CLAUDE_SESSION_ID ||
  `${Date.now()}-${process.pid}`;

const sessionDir = path.join(sessionsRoot, sessionId);
fs.mkdirSync(sessionDir, { recursive: true });

const runtimeState = fs.existsSync(runtimeStatePath)
  ? JSON.parse(fs.readFileSync(runtimeStatePath, 'utf8'))
  : {};

runtimeState.lastActivityAt = timestamp;
runtimeState.lastSource = source;

if (workflow) {
  runtimeState.lastWorkflow = workflow;
  runtimeState.lastWorkflowAt = timestamp;

  const contextSnapshotPath = path.join(sessionDir, `${workflow}-context.md`);
  const workflowStatePath = path.join(sessionDir, `${workflow}.json`);
  const workflowState = {
    active: true,
    workflow,
    current_phase: phase,
    started_at: timestamp,
    completed_at: null,
    read_only_mode: true,
    degraded_mode: false,
    missing_prerequisites: [],
    context_snapshot_path: contextSnapshotPath,
    peer_review_required: peerReviewRequired,
    peer_review_status: peerReviewRequired ? 'required' : 'not-required',
    cwd
  };

  const contextBody = [
    `# ${workflow} Context Snapshot`,
    '',
    `- source: ${source}`,
    `- created: ${timestamp}`,
    `- cwd: ${cwd}`,
    '',
    '## Task',
    '',
    task || '(not provided)',
    ''
  ].join('\n');

  fs.writeFileSync(contextSnapshotPath, `${contextBody}\n`, 'utf8');
  fs.writeFileSync(workflowStatePath, JSON.stringify(workflowState, null, 2) + '\n', 'utf8');
}

fs.writeFileSync(runtimeStatePath, JSON.stringify(runtimeState, null, 2) + '\n', 'utf8');
fs.appendFileSync(
  activityLogPath,
  JSON.stringify({
    type: workflow ? 'workflow-start' : 'runtime-touch',
    source,
    workflow: workflow || null,
    at: timestamp,
    cwd
  }) + '\n',
  'utf8'
);

process.stdout.write(
  JSON.stringify(
    {
      runtimeRoot,
      sessionId,
      workflow: workflow || null,
      source,
      activityLogPath
    },
    null,
    2
  ) + '\n'
);
