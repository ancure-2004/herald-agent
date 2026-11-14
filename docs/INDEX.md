# Documentation Index

Welcome to the Personal OS & CRM documentation. This index organizes the architectural specifications, audit trails, and operating guides.

## Architecture (`docs/architecture/`)

- [ARCHITECTURE_AND_SYSTEM_DESIGN.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/ARCHITECTURE_AND_SYSTEM_DESIGN.md) - System architecture, layered domain-driven backend design, and service boundaries.
- [AUTOPILOT_COCKPIT_SPEC.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/AUTOPILOT_COCKPIT_SPEC.md) - High-density autonomous control room specification for multi-channel outreach and discovery.
- [ROADMAP_AND_UI_SPEC.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/ROADMAP_AND_UI_SPEC.md) - Product roadmap, operational UX workflows, and UI specifications.
- [TEST_INFRA.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/TEST_INFRA.md) - End-to-end testing infrastructure design and opaque-box verification contracts.
- [backend-architecture.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/backend-architecture.md) - Backend clean architecture, repository patterns, and service layer contracts.
- [backend-autopilot.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/backend-autopilot.md) - Autopilot engine architecture, automated lead factory, and video recording pipeline.
- [cockpit-ui-spec.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/cockpit-ui-spec.md) - Detailed interface specification for the 3-tab Autopilot Cockpit.
- [design-system-master.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/design-system-master.md) - Historical design system specification for Personal OS & CRM interfaces.
- [frontend-architecture.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/architecture/frontend-architecture.md) - Next.js frontend architecture, React context hierarchy, and feature layout.

## Audits & Verification Logs (`docs/audits/`)

- [backend-refactor-changelog.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/backend-refactor-changelog.md) - Changelog of backend modularization and route separation refactoring.
- [ui-audit-before.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-audit-before.md) - Initial baseline UI audit recording visual and accessibility findings.
- [ui-audit-after.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-audit-after.md) - Post-refactor UI audit confirming resolution of visual discrepancies.
- [ui-baseline.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-baseline.md) - Baseline evaluation of UI components, dark-theme tokens, and styling invariants.
- [ui-code-patterns.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-code-patterns.md) - Survey of recurring Tailwind utility classes, z-indexes, and design patterns.
- [ui-critique-before.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-critique-before.md) - Initial heuristic critique of cockpit navigation, typography, and contrast.
- [ui-detect-before.txt](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-detect-before.txt) - Automated detection log of hardcoded colors and typography issues before polish.
- [ui-detect-after.txt](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-detect-after.txt) - Automated detection log confirming clean styles after UI pass.
- [ui-fix-plan.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-fix-plan.md) - Execution plan for UI fixes, contrast hardening, and component alignment.
- [ui-probe-before.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-probe-before.md) - Playwright DOM probe output across viewports before redesign.
- [ui-probe-after.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-probe-after.md) - Playwright DOM probe output verifying pixel perfection across viewports.
- [ui-progress.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-progress.md) - Milestone tracking log for the comprehensive UI pass.
- [ui-report.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/audits/ui-report.md) - Comprehensive final summary report of the Obsidian Flight Deck UI pass.

## Guides & Setup (`docs/guides/`)

- [TEST_READY.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/TEST_READY.md) - E2E test suite readiness report, execution instructions, and milestone gates.
- [backend-api.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/backend-api.md) - Complete REST API reference, request/response schemas, and error codes.
- [backend-development.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/backend-development.md) - Local backend development environment setup, linting, and test execution.
- [backend-environment.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/backend-environment.md) - Backend environment variable configuration and third-party credential management.
- [backend-security.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/backend-security.md) - Security invariants, CORS controls, rate limiting, and prompt injection defense.
- [frontend-development.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/frontend-development.md) - Frontend developer guide for running Next.js dev server and testing components.
- [frontend-environment.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/frontend-environment.md) - Frontend environment configuration and backend proxy setup.
- [frontend-performance.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/frontend-performance.md) - Performance best practices, memoization, and bundle optimization guidelines.
- [frontend-security.md](file:///mnt/database/Developing/firstmate/projects/PersonalOS%20and%20CRM/docs/guides/frontend-security.md) - Frontend security guidelines, sanitized rendering, and XSS prevention.
