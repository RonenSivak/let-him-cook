# Bug Fix Taxonomy

Use this reference when a workflow needs to classify programmer bug-fixing work. Classify by **what behavior is wrong**, **where the defect appears to live**, and **what kind of fix is needed**. A real bug often has one primary label plus secondary labels.

## Labels

| Label | Defect shape | Typical fix focus |
|-------|--------------|-------------------|
| `functional_correctness_bug` | Feature returns the wrong result or behavior. | Reproduce intended vs actual behavior, fix logic, add regression tests. |
| `business_logic_bug` | Domain rule is implemented incorrectly. | Restate rule source, update invariant, test domain cases. |
| `algorithm_logic_bug` | Algorithm, loop, condition, sorting, filtering, ranking, or dedupe is wrong. | Edge-case tests, complexity check, simpler invariant. |
| `edge_case_bug` | Rare, boundary, empty, large, null, duplicate, or unusual input fails. | Add targeted boundary coverage and remove hidden assumptions. |
| `validation_bug` | Input is accepted or rejected incorrectly. | Align client/server/schema validation and error messages. |
| `runtime_exception_bug` | Crash, unhandled exception, panic, type error, OOM, or process exit. | Identify throwing path, add guard/recovery, prove no masking. |
| `error_handling_bug` | Fallback, retry, cleanup, rollback, or user recovery is wrong. | Fix failure path, make retries safe, verify partial failure behavior. |
| `state_management_bug` | State is stale, invalid, lost, leaked, reset incorrectly, or desynced. | Assert state transitions, synchronize sources of truth, test race/order. |
| `data_integrity_bug` | Data is corrupt, missing, duplicated, orphaned, or inconsistent. | Code fix plus data repair/reconciliation plan when needed. |
| `database_persistence_bug` | Query, transaction, migration, index, lock, isolation, or ORM mismatch. | Query proof, transaction boundaries, migration compatibility. |
| `time_timezone_bug` | Date, timezone, DST, TTL, scheduling, expiry, or duration is wrong. | Freeze time tests, UTC/local boundaries, locale/timezone fixtures. |
| `numeric_precision_bug` | Rounding, overflow, currency, unit, percentage, or aggregation is wrong. | Use safe numeric types, explicit units, cent-level tests. |
| `api_contract_bug` | Request, response, status, version, serialization, error, or pagination contract is wrong. | Contract tests, compatibility matrix, SDK/client checks. |
| `integration_bug` | External/internal service, auth, webhook, sync, rate limit, timeout, or data mapping fails. | Provider contract, idempotency, retries, rate-limit handling. |
| `authentication_bug` | Login, signup, session, token, password reset, MFA, SSO, or account linking fails. | Security review, session/token tests, identity boundary checks. |
| `authorization_permission_bug` | Role, ownership, sharing, tenant isolation, or permission enforcement is wrong. | Deny-by-default checks, backend enforcement, tenant fixtures. |
| `security_vulnerability_bug` | Injection, XSS, CSRF, SSRF, secrets, weak crypto, or abuse path exists. | Threat model, exploit regression, coordinated mitigation if needed. |
| `privacy_compliance_bug` | PII, consent, deletion, retention, residency, export, or auditability is wrong. | Data lifecycle proof, policy citation, privacy/security review. |
| `ui_visual_bug` | Layout, styling, responsive behavior, theme, loading, empty state, or browser rendering is wrong. | Visual checks across viewports/states, screenshot evidence. |
| `ux_product_behavior_bug` | Flow, navigation, copy, feedback, undo, or intended product behavior is wrong. | Product acceptance criteria, recovery path, user-visible regression tests. |
| `accessibility_bug` | Keyboard, screen reader, focus, contrast, semantic HTML, ARIA, motion, or form a11y fails. | A11y checks, keyboard path, screen-reader labels, WCAG-aligned evidence. |
| `localization_i18n_bug` | Translation, interpolation, pluralization, RTL, locale date/number/currency, or text expansion fails. | Locale fixtures, RTL screenshots, plural/currency/date tests. |
| `platform_device_bug` | Browser, OS, mobile, hardware, offline, permission, push, or app lifecycle fails. | Platform matrix, device/browser reproduction, fallback behavior. |
| `network_connectivity_bug` | Timeout, retry, offline recovery, connection leak, DNS/TLS, proxy, payload, or slow network fails. | Timeout budgets, safe retry, degraded/offline behavior. |
| `concurrency_race_bug` | Race, deadlock, lost update, duplicate processing, non-atomic operation, or ordering issue. | Atomicity/idempotency proof, concurrent tests, lock/transaction review. |
| `distributed_system_bug` | Eventual consistency, message ordering, duplicate/missing events, replication, region, or saga issue. | Event replay, idempotent handlers, consistency and compensation checks. |
| `cache_bug` | Cache is stale, invalidated wrong, keyed wrong, public/private unsafe, or stampeding. | Key design, invalidation, TTL, permission-sensitive cache tests. |
| `performance_bug` | Behavior is too slow or expensive. | Profile/benchmark, query/bundle/resource fix, perf regression guard. |
| `resource_leak_bug` | Memory, file handle, connection, timer, listener, thread, disk, or cache leaks. | Lifecycle cleanup, long-run test, resource metric proof. |
| `scalability_capacity_bug` | Fails under load, data volume, queue depth, thresholds, autoscaling, storage growth, or fanout. | Load/data-volume tests, capacity limit, backpressure plan. |
| `build_dependency_bug` | Build, package, dependency, lockfile, native dependency, toolchain, or asset build fails. | Repro build, dependency pin/upgrade, CI parity. |
| `configuration_environment_bug` | Env vars, config drift, feature flags, secrets, region mismatch, or unsafe defaults are wrong. | Config source proof, environment diff, rollback/flag check. |
| `deployment_release_bug` | Deploy order, partial deploy, rollback, canary, artifact, blue/green, CDN, or rollout targeting is wrong. | Release timeline, compatibility, rollback and rollout guard. |
| `migration_backfill_bug` | Schema/data migration, backfill, upgrade, dual-write, cutover, deprecation, or compatibility fails. | Expand/contract sequence, backfill validation, rollback plan. |
| `test_flakiness_bug` | Test is flaky, wrong, over-mocked, slow, fixture-dependent, or falsely passing. | Deterministic oracle, fixture repair, CI/local parity. |
| `observability_monitoring_bug` | Logs, metrics, traces, alerts, dashboards, or runbooks hide or misstate behavior. | Add signal, correct metric definition, alert/runbook proof. |
| `notification_messaging_bug` | Notification is missing, duplicate, wrong recipient/channel/timing/template, or delivery fails. | Delivery proof, preference checks, idempotency, template tests. |
| `search_ranking_bug` | Search, filter, ranking, indexing lag, permission search, tokenization, or recommendation is wrong. | Indexing proof, ranking tests, permission filters, freshness checks. |
| `ai_ml_behavior_bug` | Classification, extraction, generation, hallucination, prompt, evaluation, drift, guardrail, or non-determinism fails. | Eval cases, guardrails, fallback behavior, observability. |
| `billing_payment_bug` | Charge, refund, invoice, subscription, entitlement, tax, or money flow is wrong. | Reconciliation, idempotency, audit trail, customer-impact check. |
| `workflow_process_bug` | Approval, queue, assignment, escalation, checklist, lifecycle, handoff, or SLA is wrong. | State machine invariants, actor permissions, process audit. |
| `admin_internal_tool_bug` | Admin/support/moderation/override/diagnostic/internal bulk action is wrong. | Internal permission limits, audit logs, operational safety checks. |
| `data_pipeline_analytics_bug` | ETL, tracking, dashboard, metric, warehouse, data quality, lineage, or partitioning is wrong. | Metric definition, lineage, data-quality tests, backfill validation. |
| `infrastructure_platform_bug` | Provisioning, networking, DNS, load balancer, autoscaling, storage, secrets, or IaC is wrong. | Infra diff, ownership, rollback, health/readiness checks. |
| `reliability_resilience_bug` | Graceful degradation, timeout, circuit breaker, fallback, backup/restore, failover, or health check fails. | Failure-mode test, runbook, recovery proof. |
| `abuse_fraud_bug` | Spam, fraud, bot detection, reporting, moderation bypass, quota abuse, or referral abuse works incorrectly. | Abuse case tests, rate limits, auditability, monitoring. |
| `governance_audit_bug` | Audit log, change history, approval control, access review, retention, policy enforcement, or evidence export fails. | Control evidence, immutable audit path, compliance review. |
| `setup_onboarding_bug` | Install, setup wizard, seed data, first-run, template, startup migration, or environment detection fails. | Fresh-environment reproduction, setup docs/tests, idempotency. |
| `documentation_dx_bug` | Docs, examples, SDK, CLI, local setup, generated code, dev server, or test mode misleads/fails. | Correct source of truth, runnable example, DX regression test. |
| `compatibility_regression_bug` | Previously working behavior or old browser/client/runtime/data format now fails. | Regression window, compatibility fixture, backward-compatibility proof. |
| `maintainability_code_health_bug` | Dead code, duplicate logic, hidden coupling, poor abstraction, type unsafety, undefined behavior, or invariant drift creates defects. | Narrow refactor tied to failing test; avoid unrelated cleanup. |

## Compact Groups

- Wrong result: correctness, business logic, algorithm, state, data, numeric bugs.
- Failure/crash: runtime exceptions, timeouts, process exits, unavailable dependencies.
- Bad user experience: UI, UX, accessibility, localization, mobile/device behavior.
- Unsafe behavior: authorization, authentication, security, privacy, abuse, governance.
- Bad data: corruption, loss, duplication, bad migrations, analytics/pipeline errors.
- Bad interaction: API contracts, integrations, webhooks, events, sync.
- Bad timing: races, concurrency, ordering, scheduling, timezone, cache staleness.
- Bad performance: latency, resource usage, scalability, capacity, leaks.
- Bad operations: build, config, deployment, infrastructure, monitoring, resilience.
- Bad engineering feedback loop: flaky tests, broken docs, SDK/CLI/dev tooling.

## Secondary Axes

Record these when planning or routing a bug fix:

| Axis | Values |
|------|--------|
| Severity | data-loss, security-critical, money-impacting, availability, blocking, high-friction, silent-correctness, cosmetic, flaky/intermittent, internal-only |
| Origin | new-feature, regression, refactor, dependency-upgrade, environment, scale, data-specific, time-based, race/intermittent, configuration, integration-change |
| Defect surface | frontend/UI, backend/domain, data layer, database, integration layer, infrastructure, operations, security/compliance, developer platform, docs |
| Fix strategy | logic change, validation change, guard/recovery, data repair, migration/backfill, configuration/flag change, dependency/toolchain change, rollout/rollback, observability/test-only, documentation/DX update |

## LHC Routing Notes

- Live production issue, request ID, on-call page, metrics/logs/traces, or incident symptom -> `lhc-investigate`; record bug labels as symptom hypotheses until evidence proves root cause.
- Red build, failing PR check, CI, release, or rollout failure -> `lhc-build-fix`; keep the build bucket (`code` / `flaky-test` / `release` / `ownership` / `infra`) separate from bug labels.
- Code-changing bug fix that is not a live production investigation or build/release triage -> `lhc-ralplan`; keep the plan small for focused fixes, but preserve the reproduction and regression oracle.
- Existing reviewed plan ready for execution -> `lhc-ralph`; preserve bug labels so the first test is a true regression oracle.
- Source-backed explanation of a historical or non-live bug pattern -> `lhc-research` with research intent `debug_issue`.
- Security, privacy, permission, data-loss, money-impacting, migration, concurrency, distributed, and data-integrity bugs default to planning/review even when the code diff looks small.

## Planning Implications

- Every bug-fix plan needs a reproduction path, expected vs actual behavior, and at least one regression test or executable verification that fails before the fix.
- `data_integrity_bug`, `database_persistence_bug`, `migration_backfill_bug`, `billing_payment_bug`, and `data_pipeline_analytics_bug` require a data repair/reconciliation decision: needed, not needed, or separately owned.
- `authorization_permission_bug`, `security_vulnerability_bug`, `privacy_compliance_bug`, `abuse_fraud_bug`, and `governance_audit_bug` require security/privacy/compliance acceptance criteria and audit/logging review.
- `concurrency_race_bug`, `distributed_system_bug`, `cache_bug`, `integration_bug`, `notification_messaging_bug`, and `workflow_process_bug` require idempotency, ordering, retry, and duplicate-processing checks where applicable.
- `performance_bug`, `resource_leak_bug`, and `scalability_capacity_bug` require benchmark/profile/load evidence or an explicit reason a lighter check is enough.
- `ui_visual_bug`, `ux_product_behavior_bug`, `accessibility_bug`, `localization_i18n_bug`, and `platform_device_bug` require user-visible state coverage such as viewport, keyboard, locale, browser, or device checks.
- `build_dependency_bug`, `configuration_environment_bug`, `deployment_release_bug`, and `compatibility_regression_bug` require environment/version/release-window evidence.
- `test_flakiness_bug` must prove flakiness from multiple observations before labeling the production code as innocent.

## Artifact Fields

Plans, investigations, build triage artifacts, and handoffs should make the classification explicit:

```
Bug labels: <primary label>[, <secondary label>...]
Severity: <severity axis values>
Origin: <origin axis values or unknown>
Defect surface: <surface values>
Fix strategy: <strategy values>
Bug routing rationale: <why these labels imply this workflow>
Bug verification implications: <regression, data repair, rollout, observability, and review consequences>
```
