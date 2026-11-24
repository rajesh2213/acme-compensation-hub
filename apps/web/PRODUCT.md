# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: **HR Manager** at ACME who owns compensation data quality and reporting. Currently relies on Excel for ~10,000 employees across multiple countries. Needs a single web system to view and update salary records and answer organizational pay questions without spreadsheets.

## Product Purpose

**ACME Compensation Hub** is web-based employee salary management software. It replaces spreadsheet-based compensation tracking so HR can maintain employee and salary records and answer how the organization pays people via focused analytics.

Success means: seeded 10k-employee dataset usable in-app; HR can manage salaries end-to-end; multi-country/multi-currency data is usable without mixing currencies in aggregates; core behavior is covered by automated tests.

## Positioning

A self-contained HR compensation instrument for day-to-day salary operations and pay questions—not payroll processing, not a full BI suite, and not employee self-service. Currency is always explicit; cross-currency totals are forbidden.

## Operating Context

- Desktop-first HR operations workflows: list → employee detail → salary assign/revise → analytics.
- Session-authenticated HR Manager (email/password, HttpOnly cookie, CSRF).
- Same-site reverse-proxy deployment preferred (`/` → Next.js, `/api` → Express).
- Seeded demo HR account and deterministic 10,000-employee dataset for assessment/demo use.

## Capabilities and Constraints

**In scope:** employee CRUD/search; annual salary assign/revise with optimistic concurrency and revision history; compensation analytics grouped by currency; multi-country representation.

**Out of scope:** payroll (tax/payslips), benefits/equity/merit cycles, SSO/HRIS integrations, native mobile, FX conversion, manager/employee self-service.

**Terminology:** annual salary only; statuses ACTIVE | INACTIVE | TERMINATED; OCC via salary `version`.

**Undecided (product):** hosting provider; production cookie Domain details beyond Secure + SameSite=Lax.

## Brand Commitments

- Product name: **ACME Compensation Hub**
- Visual direction (project rule): Precision HR Instrument × Dense Data Product × Quiet Professional Tool—minimal, precise, information-dense; avoid generic purple-gradient SaaS aesthetics.

## Evidence on Hand

- `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_SCHEMA.md`
- Working Express API: auth, employees, salaries, analytics
- Seed script with 10,000 employees and demo HR user
- Do not fabricate testimonials, benchmarks, or customer logos

## Product Principles

1. Prefer operational clarity over decorative UI—HR must scan dense employee and pay data quickly.
2. Never mix currencies in a single aggregate or visualization.
3. Preserve salary history integrity (atomic revisions, optimistic concurrency).
4. Keep the product self-contained and assessment-ready (seeded data, no enterprise IAM dependency).
5. Auth and session security follow the API contract; the UI never invents a second auth system.

## Accessibility & Inclusion

Target WCAG-oriented web practice (keyboard focus, readable contrast, reduced-motion respect). No separate assistive-technology requirement beyond general professional web a11y was mandated in the assessment brief.
