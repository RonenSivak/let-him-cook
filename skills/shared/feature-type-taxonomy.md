# Feature Type Taxonomy

Use this reference when a workflow needs to classify a programmer-built feature. Classify by the **capability the feature adds** to a product, system, platform, or organization. A real request often has one primary label plus secondary labels.

## Labels

| Label | Capability added | Typical planning focus |
|-------|------------------|------------------------|
| `crud_resource_management` | Manage business entities. | Entity model, list/detail/edit/delete flows, lifecycle states. |
| `data_entry_form` | Collect user input. | Validation, autosave, partial completion, error recovery. |
| `file_upload_import` | Upload, import, or ingest files/data. | Parsing, validation, limits, idempotency, partial failures. |
| `view_browse_navigation` | Display and navigate information. | IA, routing, deep links, loading/empty/error states. |
| `search_filter_sort` | Find and narrow data. | Query shape, indexing, ranking, pagination, performance. |
| `workflow_state_machine` | Model a business process. | States, transitions, actors, invariants, auditability. |
| `approval_review_queue` | Review, approve, reject, or assign work. | Permissions, queue semantics, escalation, notifications. |
| `auth_identity` | Authenticate users. | Sessions, SSO, MFA, account recovery, security review. |
| `authorization_permissions` | Control access and actions. | Resource boundaries, roles, policies, tenant isolation. |
| `profile_preferences` | Store user settings or personalization. | Defaults, scope, propagation, privacy. |
| `notification_alert` | Notify users or systems. | Templates, preferences, retries, unsubscribe, delivery proof. |
| `messaging_collaboration` | Enable people to interact. | Realtime behavior, permissions, threading, concurrency. |
| `content_document_media` | Manage content, documents, files, or media. | Versioning, drafts, publishing, moderation, storage. |
| `billing_payments_subscription` | Handle money, plans, invoices, or entitlements. | Correctness, compliance, reconciliation, rollback. |
| `dashboard_reporting_analytics` | Help users understand data. | Metric definitions, aggregation, export, query cost. |
| `admin_internal_tooling` | Help internal users operate the product. | Permissions, audit logs, support safety, operational override limits. |
| `integration_connector` | Connect to external or internal systems. | Auth, data mapping, retries, rate limits, webhooks. |
| `api_platform_sdk` | Expose programmable capabilities. | Contracts, versioning, docs, auth, compatibility. |
| `automation_background_job` | Run async, scheduled, or event-driven work. | Idempotency, retries, queues, monitoring, backfills. |
| `ai_ml_intelligence` | Use AI, ML, heuristics, or agents. | Evaluation, guardrails, fallback, observability, abuse cases. |
| `security_feature` | Protect systems, users, or data. | Threat model, sensitive logging, key handling, abuse resistance. |
| `privacy_compliance` | Satisfy legal, regulatory, policy, or privacy requirements. | Data lifecycle, consent, retention, export/deletion proof. |
| `reliability_resilience` | Keep behavior working under failure. | Retries, fallbacks, idempotency, circuit breakers, recovery. |
| `observability_operations` | Help operators understand production. | Logs, metrics, traces, dashboards, alerts, runbooks. |
| `performance_scalability` | Make behavior faster or handle more load. | Caching, pagination, indexing, async work, benchmarks. |
| `configuration_feature_flag` | Change behavior without redeploying. | Rollout, kill switch, tenant config, experiment metrics. |
| `migration_upgrade_refactor` | Change systems safely over time. | Compatibility, dual read/write, backfill, rollback, deprecation. |
| `developer_experience` | Help engineers build, test, ship, or operate software. | CLI/API ergonomics, test harnesses, local dev, docs. |
| `infrastructure_platform` | Provide foundations for other features. | Provisioning, deployment, storage, queues, secrets, ownership. |
| `localization_accessibility` | Support locales, regions, abilities, and assistive tech. | a11y checks, i18n/RTL, timezones, currency, regional rules. |
| `mobile_device_native` | Use device, browser, desktop, or native capabilities. | Permissions, offline sync, push, camera/GPS, native fallback. |
| `governance_audit` | Help organizations control and review behavior. | Audit trails, access review, policy enforcement, evidence export. |
| `onboarding_help` | Help users get started or succeed. | Tours, templates, empty states, docs, support deflection. |
| `growth_experimentation` | Acquire, activate, retain, or monetize users. | Funnel events, A/B tests, cohorts, attribution, ethics. |
| `customer_support_success` | Help users get help or help teams serve users. | Impersonation safety, diagnostics, ticket context, account health. |
| `enterprise_multi_tenant` | Support organizations and tenant boundaries. | Workspaces, SCIM/SSO, tenant isolation, enterprise settings. |

## Compact Groups

- Entity management: CRUD, lists, details, bulk actions, lifecycle.
- Input and ingestion: forms, uploads, imports, validation.
- Navigation and discovery: browsing, search, filtering, recommendations.
- Workflow and business process: approvals, state machines, queues, handoffs.
- Identity and access: authentication, authorization, enterprise tenancy.
- Communication and collaboration: notifications, comments, chat, activity.
- Content and media: documents, files, publishing, editing, moderation.
- Commerce and billing: payments, subscriptions, pricing, invoices, entitlements.
- Analytics and reporting: dashboards, charts, reports, exports.
- Admin and operations: internal tools, support tools, overrides, diagnostics.
- Integrations and APIs: connectors, webhooks, SDKs, platform surfaces.
- Automation and background work: jobs, schedules, event handlers, pipelines.
- AI and intelligence: classification, extraction, generation, recommendations.
- Security, privacy, and compliance: protection, consent, audit, retention.
- Reliability and observability: retries, recovery, logs, metrics, alerts.
- Performance and scale: caching, indexing, pagination, async processing.
- Configuration and experimentation: flags, rollout, A/B tests, tenant config.
- Migration and compatibility: upgrades, backfills, deprecations, versioning.
- Developer experience and platform: tooling, CI/CD, infrastructure, libraries.
- Localization, accessibility, and device support: language, region, a11y, native.

## Secondary Axes

Record these when planning or routing a feature request:

| Axis | Values |
|------|--------|
| Audience | end users, admins, customer support, developers, operators/SRE, security/compliance, data teams, business teams, other systems |
| Layers | frontend/UI, backend/domain, data layer, integration layer, infrastructure, operations, security/compliance, developer platform |

## LHC Routing Notes

- If the user wants to build, add, implement, design, or plan a feature, classify the feature labels first. Then route code-changing work to `lhc-ralplan`.
- If the user wants only source-backed context for how to build a feature, route to `lhc-research` with both research intent and feature labels.
- If the request is about a live production failure, route to `lhc-investigate` even if the eventual fix will be a reliability, observability, or performance feature.
- If the request is about a red build, rollout, or CI failure, route to `lhc-build-fix`.
- If a reviewed plan already exists and the user wants execution, route to `lhc-ralph`.

## Planning Implications

- `auth_identity`, `authorization_permissions`, `security_feature`, `privacy_compliance`, `billing_payments_subscription`, `governance_audit`, and `enterprise_multi_tenant` require explicit security/privacy/compliance acceptance criteria.
- `notification_alert`, `integration_connector`, `automation_background_job`, `reliability_resilience`, and `observability_operations` require idempotency, retry, monitoring, and failure-mode criteria.
- `search_filter_sort`, `dashboard_reporting_analytics`, `performance_scalability`, and data-heavy `file_upload_import` require performance and data-volume criteria.
- `localization_accessibility`, `mobile_device_native`, `view_browse_navigation`, and `data_entry_form` require frontend state, accessibility, and responsive behavior criteria when a UI is involved.
- `migration_upgrade_refactor` and `configuration_feature_flag` require rollout and rollback criteria.

## Artifact Fields

Plans and interview handoffs should make the classification explicit:

```
Feature labels: <primary label>[, <secondary label>...]
Audience: <audience values>
Layers: <layer values>
Feature routing rationale: <why these labels imply this workflow>
Feature planning implications: <acceptance criteria, risk, standards, and verification consequences>
```
