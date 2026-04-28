const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function walkFiles(rootDir) {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      files.push(path.relative(repoRoot, fullPath));
    }
  }

  walk(path.join(repoRoot, rootDir));
  return files.sort();
}

test('README does not rely on removed Codex plugin CLI commands', () => {
  const readme = read('README.md');
  assert.doesNotMatch(readme, /\bcodex plugin list\b/);
});

test('shared skill docs are host-neutral for plugin root lookup', () => {
  const files = [
    'README.md',
    'scripts/precompact-reinject.js',
    'scripts/stop-reminder.js',
    'skills/shared/notepad-schema.md',
    'skills/shared/peer-review-governance.md',
    ...walkFiles('skills').filter(file => file.endsWith('.md')),
  ];

  for (const file of files) {
    const content = read(file);
    const offendingLine = content
      .split('\n')
      .find(line => line.includes('CLAUDE_PLUGIN_ROOT') && !line.includes('CODEX_PLUGIN_ROOT'));
    assert.equal(offendingLine, undefined, `${file} still assumes Claude-only plugin root`);
  }
});

test('shared peer review examples do not hardcode Claude as the leader', () => {
  const files = [
    'README.md',
    'scripts/stop-reminder.js',
    'skills/shared/peer-review-governance.md',
    ...walkFiles('skills').filter(file => file.endsWith('.md')),
  ];

  for (const file of files) {
    const content = read(file);
    assert.doesNotMatch(
      content,
      /peer-review\.sh[^\n]*--leader\s+claude/,
      `${file} still hardcodes --leader claude`
    );
  }
});

test('Codex manifest points back to this repository', () => {
  const plugin = JSON.parse(read('.codex-plugin/plugin.json'));
  assert.equal(plugin.repository, 'https://github.com/RonenSivak/let-him-cook');
});

test('Codex installer supports a safe dry-run', () => {
  const fakeHome = path.join(os.tmpdir(), `lhc-codex-${Date.now()}`);
  const output = childProcess.execFileSync(
    process.execPath,
    ['scripts/install-codex-plugin.js', '--dry-run', '--home', fakeHome],
    { cwd: repoRoot, encoding: 'utf8' }
  );

  assert.match(output, /\[codex-plugin\] dry-run let-him-cook/);
  assert.match(output, /marketplace\.json/);
  assert.match(output, /config\.toml/);
});

test('research workflow classifies programmer research by intent and source need', () => {
  const taxonomy = read('skills/shared/research-intent-taxonomy.md');
  const researchSkill = read('skills/lhc-research/SKILL.md');
  const interviewSkill = read('skills/lhc-interview/SKILL.md');
  const routerManifest = read('skills/lhc-research/agents/openai.yaml');
  const handoffProtocol = read('skills/shared/handoff-protocol.md');

  const expectedLabels = [
    'learn_concept',
    'how_to_implement',
    'internal_best_practice',
    'codebase_understanding',
    'design_decision',
    'rfc_review',
    'compare_options',
    'debug_issue',
    'verify_correctness',
    'security_privacy_review',
    'performance_optimization',
    'integration_research',
    'migration_upgrade',
    'testing_strategy',
    'ops_reliability',
    'planning_estimation',
    'documentation_communication',
    'ecosystem_awareness',
  ];

  const actualLabels = [...taxonomy.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(
    actualLabels,
    expectedLabels,
    'research taxonomy labels and test expectations drifted'
  );

  for (const label of expectedLabels) {
    assert.match(taxonomy, new RegExp(`\\b${label}\\b`), `${label} missing from taxonomy`);
  }

  assert.match(researchSkill, /Research Intent Classification/);
  assert.match(researchSkill, /programmer action/i);
  assert.match(researchSkill, /Source Selection/);
  assert.match(researchSkill, /Intent label: <[^>]+>/);
  assert.match(researchSkill, /Source plan: <[^>]+>/);
  assert.match(researchSkill, /Answer format: <[^>]+>/);
  assert.match(researchSkill, /Intent label and answer format included in the terminal handoff/);
  assert.match(handoffProtocol, /Intent label: <research intent>/);
  assert.match(handoffProtocol, /Answer format: <format>/);
  assert.match(interviewSkill, /programmer research/i);
  assert.match(interviewSkill, /design_decision/);
  assert.match(routerManifest, /intent label/i);
  assert.match(routerManifest, /source-backed synthesis/i);
});

test('feature implementation workflows classify requested feature capability before routing and planning', () => {
  const taxonomy = read('skills/shared/feature-type-taxonomy.md');
  const interviewSkill = read('skills/lhc-interview/SKILL.md');
  const ralplanSkill = read('skills/lhc-ralplan/SKILL.md');
  const standardsSkill = read('skills/lhc-standards/SKILL.md');

  const expectedLabels = [
    'crud_resource_management',
    'data_entry_form',
    'file_upload_import',
    'view_browse_navigation',
    'search_filter_sort',
    'workflow_state_machine',
    'approval_review_queue',
    'auth_identity',
    'authorization_permissions',
    'profile_preferences',
    'notification_alert',
    'messaging_collaboration',
    'content_document_media',
    'billing_payments_subscription',
    'dashboard_reporting_analytics',
    'admin_internal_tooling',
    'integration_connector',
    'api_platform_sdk',
    'automation_background_job',
    'ai_ml_intelligence',
    'security_feature',
    'privacy_compliance',
    'reliability_resilience',
    'observability_operations',
    'performance_scalability',
    'configuration_feature_flag',
    'migration_upgrade_refactor',
    'developer_experience',
    'infrastructure_platform',
    'localization_accessibility',
    'mobile_device_native',
    'governance_audit',
    'onboarding_help',
    'growth_experimentation',
    'customer_support_success',
    'enterprise_multi_tenant',
  ];

  const actualLabels = [...taxonomy.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(
    actualLabels,
    expectedLabels,
    'feature taxonomy labels and test expectations drifted'
  );

  for (const label of expectedLabels) {
    assert.match(taxonomy, new RegExp(`\\b${label}\\b`), `${label} missing from taxonomy`);
  }

  assert.match(interviewSkill, /Feature Type Classification/);
  assert.match(interviewSkill, /Feature labels: <[^>]+>/);
  assert.match(interviewSkill, /Feature routing rationale: <[^>]+>/);
  assert.match(ralplanSkill, /Feature Type Classification/);
  assert.match(ralplanSkill, /Feature labels: <[^>]+>/);
  assert.match(ralplanSkill, /Audience: <[^>]+>/);
  assert.match(ralplanSkill, /Layers: <[^>]+>/);
  assert.match(standardsSkill, /feature-type-taxonomy\.md/);
});

test('bug-fix workflows classify wrong behavior before routing, planning, and execution', () => {
  const taxonomy = read('skills/shared/bug-fix-taxonomy.md');
  const interviewSkill = read('skills/lhc-interview/SKILL.md');
  const ralplanSkill = read('skills/lhc-ralplan/SKILL.md');
  const ralphSkill = read('skills/lhc-ralph/SKILL.md');
  const buildFixSkill = read('skills/lhc-build-fix/SKILL.md');
  const investigateSkill = read('skills/lhc-investigate/SKILL.md');
  const teamSkill = read('skills/lhc-team/SKILL.md');
  const standardsSkill = read('skills/lhc-standards/SKILL.md');
  const researchSkill = read('skills/lhc-research/SKILL.md');
  const handoffProtocol = read('skills/shared/handoff-protocol.md');
  const notepadSchema = read('skills/shared/notepad-schema.md');

  const expectedLabels = [
    'functional_correctness_bug',
    'business_logic_bug',
    'algorithm_logic_bug',
    'edge_case_bug',
    'validation_bug',
    'runtime_exception_bug',
    'error_handling_bug',
    'state_management_bug',
    'data_integrity_bug',
    'database_persistence_bug',
    'time_timezone_bug',
    'numeric_precision_bug',
    'api_contract_bug',
    'integration_bug',
    'authentication_bug',
    'authorization_permission_bug',
    'security_vulnerability_bug',
    'privacy_compliance_bug',
    'ui_visual_bug',
    'ux_product_behavior_bug',
    'accessibility_bug',
    'localization_i18n_bug',
    'platform_device_bug',
    'network_connectivity_bug',
    'concurrency_race_bug',
    'distributed_system_bug',
    'cache_bug',
    'performance_bug',
    'resource_leak_bug',
    'scalability_capacity_bug',
    'build_dependency_bug',
    'configuration_environment_bug',
    'deployment_release_bug',
    'migration_backfill_bug',
    'test_flakiness_bug',
    'observability_monitoring_bug',
    'notification_messaging_bug',
    'search_ranking_bug',
    'ai_ml_behavior_bug',
    'billing_payment_bug',
    'workflow_process_bug',
    'admin_internal_tool_bug',
    'data_pipeline_analytics_bug',
    'infrastructure_platform_bug',
    'reliability_resilience_bug',
    'abuse_fraud_bug',
    'governance_audit_bug',
    'setup_onboarding_bug',
    'documentation_dx_bug',
    'compatibility_regression_bug',
    'maintainability_code_health_bug',
  ];

  const actualLabels = [...taxonomy.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(
    actualLabels,
    expectedLabels,
    'bug taxonomy labels and test expectations drifted'
  );

  for (const label of expectedLabels) {
    assert.match(taxonomy, new RegExp(`\\b${label}\\b`), `${label} missing from taxonomy`);
  }

  assert.match(taxonomy, /Severity/);
  assert.match(taxonomy, /Origin/);
  assert.match(taxonomy, /Defect surface/);
  assert.match(taxonomy, /Fix strategy/);
  assert.match(taxonomy, /Every bug-fix plan needs a reproduction path/);

  assert.match(interviewSkill, /Bug Fix Classification/);
  assert.match(interviewSkill, /Bug labels: <primary label>\[, <secondary label>\.\.\.\]/);
  assert.match(interviewSkill, /Bug routing rationale: <why this route fits>/);
  assert.match(interviewSkill, /Any code-changing bug fix that is not a live production investigation or build\/release triage -> `lhc-ralplan`/);
  assert.match(ralplanSkill, /Bug Fix Classification/);
  assert.match(ralplanSkill, /code-changing bug fix routed from `lhc-interview`/);
  assert.match(ralplanSkill, /Bug labels: <primary label>\[, <secondary label>\.\.\.\]/);
  assert.match(ralplanSkill, /Bug verification implications: <regression, data repair, rollout, observability, and review consequences>/);
  assert.match(ralplanSkill, /bug-labels=<labels>/);
  assert.match(ralphSkill, /failing test must reproduce the reported wrong behavior/);
  assert.match(ralphSkill, /expected vs actual behavior/);
  assert.match(buildFixSkill, /build bucket/);
  assert.match(buildFixSkill, /Bug Fix Classification/);
  assert.match(buildFixSkill, /after the triage artifact is saved and peer-reviewed/);
  assert.match(buildFixSkill, /bug-labels=<labels\|unknown>\s+\(only if classification=code\)/);
  assert.match(buildFixSkill, /severity=<severity>\s+\(only if classification=code\)/);
  assert.match(buildFixSkill, /origin=<origin>\s+\(only if classification=code\)/);
  assert.match(buildFixSkill, /defect-surface=<surface>\s+\(only if classification=code\)/);
  assert.match(buildFixSkill, /fix-strategy=<strategy>\s+\(only if classification=code\)/);
  assert.match(buildFixSkill, /omit the entire `Next skill` and `Pass to next skill` block/);
  assert.match(investigateSkill, /hypothesis:<label>/);
  assert.match(investigateSkill, /bug classification/);
  assert.match(investigateSkill, /omit the entire `Next skill` and `Pass to next skill` block/);
  assert.match(teamSkill, /pre-fix reproduction\/regression expectations/);
  assert.match(teamSkill, /team artifact records the bug classification/);
  assert.match(standardsSkill, /bug-fix-taxonomy\.md/);
  assert.match(researchSkill, /debug_issue/);
  assert.match(researchSkill, /Bug labels: <primary label>/);
  assert.match(handoffProtocol, /Bug labels: <labels>/);
  assert.match(handoffProtocol, /Fix strategy: <strategy values>/);
  assert.match(notepadSchema, /bug_labels=<comma-separated-labels\|unknown\|hypothesis:label>/);
});

test('plugin and skill specialist reviewers are wired into the review loop', () => {
  const expectedRoles = [
    'plugin-structure-reviewer',
    'skill-authoring-reviewer',
  ];

  for (const role of expectedRoles) {
    const prompt = read(`prompts/${role}.md`);
    const agent = read(`agents/${role}.md`);
    assert.match(prompt, /Verdict/);
    assert.match(prompt, /approved \| approved-with-changes \| rejected/);
    assert.match(prompt, /science-backed/i);
    assert.match(prompt, /plugin-skill-review-evidence\.md/);
    assert.match(agent, /Verdict/);
    assert.match(agent, /approved \| approved-with-changes \| rejected/);
    assert.match(agent, /science-backed/i);
    assert.match(agent, /plugin-skill-review-evidence\.md/);
  }

  const evidence = read('skills/shared/plugin-skill-review-evidence.md');
  assert.match(evidence, /Progressive disclosure/);
  assert.match(evidence, /External feedback/);
  assert.match(evidence, /Generate-Verify-Refine/);
  assert.match(evidence, /https:\/\/www\.anthropic\.com\/engineering\/equipping-agents-for-the-real-world-with-agent-skills/);
  assert.match(evidence, /https:\/\/openai\.com\/index\/unrolling-the-codex-agent-loop/);
  assert.match(evidence, /https:\/\/proceedings\.iclr\.cc\/paper_files\/paper\/2024\/hash\/fef126561bbf9d4467dbb8d27334b8fe-Abstract-Conference\.html/);

  const reviewSkill = read('skills/lhc-review/SKILL.md');
  assert.match(reviewSkill, /plugin-structure-reviewer/);
  assert.match(reviewSkill, /skill-authoring-reviewer/);
  assert.match(reviewSkill, /pre-flight gate before counterpart review/);
  assert.match(reviewSkill, /If both specialist verdicts are `approved`, continue to the counterpart review stage/);
  assert.match(reviewSkill, /save a review artifact with the specialist verdicts and stop with an overall non-approved verdict/);
  assert.match(reviewSkill, /outside `lhc-review` may fix findings and rerun `lhc-review` until both specialist verdicts are approved/);
  assert.match(reviewSkill, /does not edit the reviewed artifact or implement reviewer suggestions/);
  assert.match(reviewSkill, /specialist reviewer verdicts/);
  assert.ok(
    reviewSkill.indexOf('Plugin/skill specialist review loop') < reviewSkill.indexOf('Route by leader'),
    'specialist review must run before counterpart Route by leader section'
  );
  assert.ok(
    reviewSkill.indexOf('Plugin/skill specialist review loop') < reviewSkill.indexOf('/scripts/peer-review.sh'),
    'specialist review must appear before the first counterpart peer-review.sh route'
  );

  const ralplanSkill = read('skills/lhc-ralplan/SKILL.md');
  assert.match(ralplanSkill, /Feature labels: <primary label>\[, <secondary label>\.\.\.\]/);
  assert.match(ralplanSkill, /feature-labels=<labels>/);
  assert.match(ralplanSkill, /audience=<audience>/);
  assert.match(ralplanSkill, /layers=<layers>/);

  const catalog = read('skills/shared/subagent-catalog.md');
  assert.match(catalog, /plugin-structure-reviewer/);
  assert.match(catalog, /skill-authoring-reviewer/);
});
