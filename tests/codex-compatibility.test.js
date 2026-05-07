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

test('confidence-emitting workflows require exhaustion before lower confidence', () => {
  const policy = read('skills/shared/confidence-escalation-policy.md');
  const researchSkill = read('skills/lhc-research/SKILL.md');
  const investigateSkill = read('skills/lhc-investigate/SKILL.md');
  const standardsSkill = read('skills/lhc-standards/SKILL.md');
  const handoffProtocol = read('skills/shared/handoff-protocol.md');
  const ironLaws = read('skills/shared/iron-laws.md');
  const usingLhc = read('skills/using-lhc/SKILL.md');

  assert.match(policy, /Do not return `medium` or `low`/);
  assert.match(policy, /Exhaustion Ledger/);
  assert.match(policy, /Confidence Blockers/);
  assert.match(policy, /Next Evidence That Would Raise Confidence/);
  assert.match(policy, /Do not ask the user to resolve an evidence gap until local read-only options/);

  for (const skill of [researchSkill, investigateSkill, standardsSkill]) {
    assert.match(skill, /confidence-escalation-policy\.md/);
    assert.match(skill, /Confidence gate/);
    assert.match(skill, /Exhaustion Ledger/);
    assert.match(skill, /Next Evidence That Would Raise Confidence/);
    assert.match(skill, /medium` or `low`/);
  }

  assert.match(handoffProtocol, /confidence-escalation-policy\.md/);
  assert.match(ironLaws, /No premature low confidence/);
  assert.match(usingLhc, /Confidence after exhaustion/);
});

test('strict local peer-review fallback is wired for counterpart failures', () => {
  const prompt = read('prompts/strict-peer-reviewer.md');
  const agent = read('agents/strict-peer-reviewer.md');
  const governance = read('skills/shared/peer-review-governance.md');
  const reviewSkill = read('skills/lhc-review/SKILL.md');
  const catalog = read('skills/shared/subagent-catalog.md');
  const readme = read('README.md');
  const agentsMd = read('AGENTS.md');
  const claudeMd = read('CLAUDE.md');
  const evidence = read('docs/evidence.md');
  const precompact = read('scripts/precompact-reinject.js');
  const usingLhc = read('skills/using-lhc/SKILL.md');
  const ironLaws = read('skills/shared/iron-laws.md');
  const confidencePolicy = read('skills/shared/confidence-escalation-policy.md');

  for (const content of [prompt, agent]) {
    assert.match(content, /Strict Peer Reviewer/);
    assert.match(content, /review-only fallback/i);
    assert.match(content, /approved \| approved-with-changes \| rejected/);
    assert.doesNotMatch(content, /approved \| approved-with-changes \| rejected \| degraded/);
    assert.match(content, /strict-local-fallback/);
    assert.match(content, /Spec Compliance/);
    assert.match(content, /MODE=code-review/);
    assert.match(content, /Do not edit files/);
  }

  assert.match(agent, /tools: Read, Grep, Glob/);
  assert.doesNotMatch(agent, /tools: .*Bash/);

  const strictFallbackSummaries = [
    ['prompts/strict-peer-reviewer.md', prompt],
    ['agents/strict-peer-reviewer.md', agent],
    ['skills/shared/peer-review-governance.md', governance],
    ['skills/shared/confidence-escalation-policy.md', confidencePolicy],
    ['skills/lhc-review/SKILL.md', reviewSkill],
  ];

  for (const [file, content] of strictFallbackSummaries) {
    assert.match(content, /missing/, `${file} must mention missing CLI fallback`);
    assert.match(content, /token\/quota|token.*quota|quota.*token/, `${file} must mention token/quota fallback`);
    assert.match(content, /rate-limited/, `${file} must mention rate-limit fallback`);
    assert.match(content, /timed out|times out/, `${file} must mention timeout fallback`);
    assert.match(content, /crashed|crash/, `${file} must mention crash fallback`);
    assert.match(content, /unparseable verdict/, `${file} must mention unparseable verdict fallback`);
  }

  assert.match(governance, /Strict Local Fallback/);
  assert.match(governance, /token\/quota|token.*quota|quota.*token/);
  assert.match(governance, /strict-peer-reviewer/);
  assert.match(governance, /counterpart_coverage=degraded/);
  assert.match(governance, /return only `approved`, `approved-with-changes`, or `rejected`/);
  assert.match(governance, /Spec Compliance/);
  assert.match(governance, /criterion-by-criterion/);
  assert.match(governance, /two distinct\s+fallback passes/);
  assert.match(governance, /plan acceptance criteria plus diff/);
  assert.match(governance, /diff plus standards brief/);
  assert.match(governance, /all stages `approved` -> overall `approved`/);
  assert.match(governance, /any stage `approved-with-changes`/);
  assert.match(governance, /any stage `rejected` -> overall `rejected`/);
  assert.match(governance, /All counterpart reviews go through/);
  assert.match(governance, /Codex: native `code-reviewer` subagent seeded with `prompts\/strict-peer-reviewer\.md`/);
  assert.match(governance, /never `default`, `executor`, or a worker role/);
  assert.match(reviewSkill, /strict-peer-reviewer/);
  assert.match(reviewSkill, /Codex: spawn the native `code-reviewer` subagent with `prompts\/strict-peer-reviewer\.md`/);
  assert.match(reviewSkill, /Do not use `default`, `executor`/);
  assert.match(reviewSkill, /two distinct fallback passes/);
  assert.match(reviewSkill, /plan's acceptance criteria \+ the diff/);
  assert.match(reviewSkill, /diff \+ standards brief/);
  assert.match(reviewSkill, /overall verdict is `approved` only if every stage is `approved`/);
  assert.match(reviewSkill, /If any stage is `approved-with-changes`, the overall verdict is `approved-with-changes`/);
  assert.match(reviewSkill, /If any stage is `rejected`, the overall verdict is `rejected`/);
  assert.match(reviewSkill, /Review route: strict-local-fallback/);
  assert.match(reviewSkill, /Review route: degraded-none/);
  assert.match(reviewSkill, /Counterpart failure/);

  const fallbackEnabledSkills = [
    'skills/lhc-review/SKILL.md',
    'skills/lhc-ralplan/SKILL.md',
    'skills/lhc-ralph/SKILL.md',
    'skills/lhc-investigate/SKILL.md',
    'skills/lhc-build-fix/SKILL.md',
    'skills/lhc-team/SKILL.md',
  ];

  const triggerWordsRequired = [
    { word: 'missing', label: 'missing CLI' },
    { word: 'token|out of tokens', label: 'token/quota' },
    { word: 'rate-limited|rate limit', label: 'rate-limit' },
    { word: 'timed out|timeout|times out', label: 'timeout' },
    { word: 'crash|crashed|crashes', label: 'crash' },
    { word: 'unparseable', label: 'unparseable verdict' },
  ];

  for (const file of fallbackEnabledSkills) {
    const content = read(file);
    const checklist = content.split('<Final_Checklist>')[1] || '';
    assert.match(content, /timed out|timeout/, `${file} must handle timeout fallback`);
    assert.match(content, /Review route: strict-local-fallback/, `${file} missing strict fallback route`);
    assert.match(content, /Review route: degraded-none/, `${file} missing degraded-none route`);
    assert.match(content, /Counterpart coverage: degraded/, `${file} missing counterpart coverage field`);
    assert.match(content, /Counterpart failure/, `${file} missing counterpart failure field`);

    const triggerProse = (content.match(
      /(counterpart (review|CLI)[^.]*?(missing|out of tokens)[\s\S]*?)(unparseable|verdict|fallback)[^.]*\./gi
    ) || []).join('\n');
    for (const { word, label } of triggerWordsRequired) {
      assert.match(
        triggerProse,
        new RegExp(word, 'i'),
        `${file} trigger-prose must mention ${label} alongside other counterpart failure modes`
      );
    }

    assert.match(checklist, /Review route|Review Route/, `${file} checklist must enforce review route`);
    assert.match(checklist, /Counterpart coverage|counterpart coverage/, `${file} checklist must enforce counterpart coverage`);
    assert.match(checklist, /Counterpart failure|counterpart failure/, `${file} checklist must enforce counterpart failure`);
  }

  assert.match(catalog, /strict-peer-reviewer/);
  assert.match(catalog, /Codex uses native `code-reviewer` seeded with `prompts\/strict-peer-reviewer\.md`/);
  assert.match(readme, /strict-peer-reviewer/);
  assert.match(agentsMd, /strict-peer-reviewer/);
  assert.match(claudeMd, /strict-peer-reviewer/);

  const summarySurfaces = [
    ['README.md', readme],
    ['AGENTS.md', agentsMd],
    ['CLAUDE.md', claudeMd],
    ['docs/evidence.md', evidence],
    ['scripts/precompact-reinject.js', precompact],
    ['skills/using-lhc/SKILL.md', usingLhc],
    ['skills/shared/iron-laws.md', ironLaws],
  ];

  for (const [file, content] of summarySurfaces) {
    assert.match(content, /missing/, `${file} must mention missing CLI fallback`);
    assert.match(content, /token\/quota|token.*quota|quota.*token/, `${file} must mention token/quota fallback`);
    assert.match(content, /rate-limited/, `${file} must mention rate-limit fallback`);
    assert.match(content, /timed out/, `${file} must mention timeout fallback`);
    assert.match(content, /crashed|crash/, `${file} must mention crash fallback`);
    assert.match(content, /unparseable verdict/, `${file} must mention unparseable verdict fallback`);
  }
});

test('package.json declares zero runtime dependencies (zero-deps contract)', () => {
  const pkgPath = path.join(repoRoot, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist at repo root');

  const pkg = JSON.parse(read('package.json'));
  const deps = pkg.dependencies || {};
  assert.equal(
    Object.keys(deps).length,
    0,
    `package.json must declare zero runtime dependencies; got: ${Object.keys(deps).join(', ')}`,
  );
});

test('Claude monitors manifest is wired and self-consistent (B1)', () => {
  const manifestPath = path.join(repoRoot, 'monitors/monitors.json');
  assert.ok(fs.existsSync(manifestPath), 'monitors/monitors.json must exist');

  const monitors = JSON.parse(read('monitors/monitors.json'));
  assert.ok(Array.isArray(monitors), 'monitors.json must be a top-level array (Claude Code 2.1+ schema)');

  // Claude Code 2.1's monitors schema is still narrow — accepts name/description/command only,
  // and rejects trigger/args/match/notify/enabled_by_default. The previous schema documented in
  // this file's comment block predates that restriction. Until Anthropic publishes a stable
  // schema for the documented monitor primitives (interval triggers, json-path-non-empty matches,
  // notification payload), monitors.json ships as an empty array so the plugin loads cleanly.
  // Each entry, when present, must minimally declare name + description.
  for (const monitor of monitors) {
    for (const field of ['name', 'description']) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(monitor, field),
        `monitor missing "${field}": ${JSON.stringify(monitor)}`,
      );
    }
  }

  const claudeManifest = JSON.parse(read('.claude-plugin/plugin.json'));
  assert.ok(
    claudeManifest.experimental && Object.prototype.hasOwnProperty.call(claudeManifest.experimental, 'monitors'),
    'Claude plugin.json must declare an "experimental.monitors" field pointing at the monitors directory (Claude Code 2.1+ moved monitors under the experimental namespace)',
  );
});

test('Claude manifest declares userConfig; Codex manifest does not (intentional parity gap)', () => {
  const claudeManifest = JSON.parse(read('.claude-plugin/plugin.json'));
  const codexManifest = JSON.parse(read('.codex-plugin/plugin.json'));

  assert.ok(
    Object.prototype.hasOwnProperty.call(claudeManifest, 'userConfig'),
    'Claude manifest must declare userConfig per Anthropic plugins reference (B2)',
  );
  assert.equal(
    typeof claudeManifest.userConfig,
    'object',
    'userConfig must be an object',
  );

  assert.ok(
    !Object.prototype.hasOwnProperty.call(codexManifest, 'userConfig'),
    'Codex manifest must NOT declare userConfig — Codex does not document this primitive yet (intentional parity gap, see README "Codex env-var setup")',
  );

  const requiredKeys = ['MCP_S_TOKEN', 'OCTOCODE_TOKEN'];
  for (const key of requiredKeys) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(claudeManifest.userConfig, key),
      `Claude userConfig must declare "${key}"`,
    );
    assert.equal(
      typeof claudeManifest.userConfig[key].description,
      'string',
      `userConfig.${key}.description must be a string`,
    );
  }

  const readme = read('README.md');
  assert.match(
    readme,
    /Codex env-var setup|Codex.*\.codex\/config\.toml/,
    'README.md must document the Codex env-var workaround as the equivalent of userConfig',
  );
  for (const key of requiredKeys) {
    assert.match(
      readme,
      new RegExp(key.replace(/_/g, '_')),
      `README.md must mention ${key} so Codex users know which env vars to set`,
    );
  }
});

test('permissions.json validates against permissions.schema.json (capability ledger contract)', () => {
  const dataRaw = read('permissions.json');
  const schemaRaw = read('permissions.schema.json');
  const data = JSON.parse(dataRaw);
  const schema = JSON.parse(schemaRaw);

  assert.equal(
    data.$schema,
    schema.$id,
    'permissions.json $schema URL must equal permissions.schema.json $id',
  );

  const requiredTopLevel = ['defaults', 'rules', 'denied_mcp_tools', 'notes'];
  for (const key of requiredTopLevel) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(data, key),
      `permissions.json must declare top-level "${key}"`,
    );
    assert.ok(
      Object.prototype.hasOwnProperty.call(schema.properties || {}, key),
      `permissions.schema.json must define properties["${key}"]`,
    );
  }

  assert.ok(Array.isArray(data.rules), 'permissions.json rules must be an array');
  for (const rule of data.rules) {
    for (const field of ['id', 'description', 'match', 'effect']) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(rule, field),
        `every rule must declare "${field}" — offender: ${rule.id || JSON.stringify(rule)}`,
      );
    }
  }

  assert.ok(
    Array.isArray(data.denied_mcp_tools),
    'permissions.json must declare denied_mcp_tools as an array',
  );
  assert.ok(
    data.denied_mcp_tools.length >= 15,
    `denied_mcp_tools must list at least 15 entries; got ${data.denied_mcp_tools.length}`,
  );
  for (const entry of data.denied_mcp_tools) {
    assert.equal(typeof entry.server, 'string', `denied entry missing string "server": ${JSON.stringify(entry)}`);
    assert.equal(typeof entry.tool, 'string', `denied entry missing string "tool": ${JSON.stringify(entry)}`);
  }

  const expectedServers = ['jira', 'slack', 'grafana', 'devex'];
  for (const server of expectedServers) {
    assert.ok(
      data.denied_mcp_tools.some(entry => entry.server === server),
      `denied_mcp_tools must include at least one entry for server "${server}"`,
    );
  }

  const govRules = read('skills/shared/read-only-governance.md');
  assert.match(
    govRules,
    /denied_mcp_tools/,
    'read-only-governance.md must reference denied_mcp_tools (capability ledger as data)',
  );
});

test('strict-peer-reviewer surfaces require review-attack-surface reading', () => {
  const reviewerFiles = [
    'agents/strict-peer-reviewer.md',
    'prompts/strict-peer-reviewer.md',
    'agents/skill-authoring-reviewer.md',
    'agents/plugin-structure-reviewer.md',
  ];

  for (const file of reviewerFiles) {
    const content = read(file);
    assert.match(
      content,
      /review-attack-surface\.md/,
      `${file} must reference skills/shared/review-attack-surface.md as required reading`,
    );
  }

  const attackSurface = read('skills/shared/review-attack-surface.md');
  const expectedFailureModes = [
    /model-pleasing approval/i,
    /reviewer fatigue/i,
    /summary inflation/i,
    /reward[- ]hack/i,
    /duplicate[- ]issue overlap|duplicate[- ]PR overlap/i,
    /CLA|licensing/i,
  ];

  for (const pattern of expectedFailureModes) {
    assert.match(
      attackSurface,
      pattern,
      `review-attack-surface.md must catalog failure mode matching ${pattern}`,
    );
  }

  const catalog = read('skills/shared/subagent-catalog.md');
  assert.match(
    catalog,
    /review-attack-surface\.md/,
    'subagent-catalog.md must mention review-attack-surface.md so reviewers discover it',
  );
});
