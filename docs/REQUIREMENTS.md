# ACME Compensation Hub: Product Requirements

**Status:** Planning · **Baseline:** Salary Management Assessment (candidates brief)  
**Legend:** **[M]** mandated by assessment · **[P]** proposed to fulfill the brief (not explicitly enumerated)

## 1. Product goal

**[M]** Build web-based employee salary management software so ACME's HR team can stop managing ~10,000 employees' salary data in spreadsheets across multiple countries, and can answer questions about how the organization pays people.

## 2. Primary user persona

**[M] HR Manager:** owns compensation data quality and reporting for the organization; currently relies on Excel; needs a single web system to view/update salary records and answer pay questions rather than using Excel.

## 3. Functional scope

| Area | Scope |
|------|--------|
| **Employee management** | **[P]** Create, view, update, and search employee records needed for compensation context (identity, role/org attributes tied to pay). |
| **Salary management** | **[M]/[P]** Maintain salary data in-app (replace Excel); record and change compensation amounts so HR can manage pay and answer questions about it. **[P]** Salary revision history preserves previous amount, new amount, currency, effective date, and change timestamp. |
| **Compensation analytics** | **[M]/[P]** Answer "how the org pays people" via summaries and filters (e.g. by country, role, or other stored attributes); not a full BI suite. |
| **Multi-country support** | **[M]** Represent employees and pay across multiple countries (country on records; currency per amount). **[P]** Do not directly aggregate compensation amounts across different currencies. |
| **Data management** | **[M]** Persist data in a relational database; **[M]** seed script with **10,000** employees; **[P]** practical list/filter/update flows for day-to-day HR use. |

## 4. Non-functional requirements

- **[M]** End-to-end, fully functional software (backend + UI).  
- **[M]** UI: React or Next.js (stack preference TBD for role). Relational DB of choice (e.g. SQLite).  
- **[M]** Production-quality code structure, readability, maintainability; meaningful, fast, deterministic unit tests for core behavior.  
- **[M]** Deployed, usable application; video demo of the software.  
- **[M]** Incremental Git history showing solution evolution; planning/design artifacts committed with the solution.  
- **[P]** Usable at ~10k-employee scale for list, search, update, and aggregate queries without spreadsheet tools.  
- **[P]** Authentication and access control are architecture decisions to finalize in design (not specified here; enterprise SSO is not a product requirement).

## 5. Out of scope (deliberate)

| Excluded | Why |
|----------|-----|
| Full payroll (tax, deductions, payslips, bank file) | Brief asks salary *management* and pay *questions*, not payroll processing. |
| Employee / manager self-service portals | Sole persona is HR Manager; multi-role product expands scope without assessment value. |
| Benefits, equity, performance / merit-cycle workflows | Adjacent HR domains; outside the salary-data and pay-questions brief. |
| Live HRIS/payroll integrations & SSO/enterprise IAM | Assessment expects a self-contained, seeded system, not an integration project. |
| Native mobile apps; advanced BI / export-to-finance suites | Web UI plus focused analytics cover the brief; wider product surface area is out of scope. |

## 6. Measurable success criteria

1. **[M]** One-page requirements artifact exists before build (this document).  
2. **[M]** Seeded dataset of **10,000** employees loads successfully.  
3. **[M]** HR Manager can manage salary data via the web UI (no Excel required for core flows).  
4. **[M]** HR Manager can answer questions about organizational pay (analytics/views backed by stored data).  
5. **[M]** Multi-country employee/salary data is representable and usable in those flows.  
6. **[M]** Core functionality covered by meaningful automated unit tests; app deployed with a video demo; incremental commits + thinking artifacts in the repo.
