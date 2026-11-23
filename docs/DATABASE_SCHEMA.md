# ACME Compensation Hub: Database Schema

**Status:** Design · **Baseline:** `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`  
**Legend:** **[C]** confirmed · **[A]** assumption · **[U]** unresolved  
**Scope:** PostgreSQL design only. No Prisma models, migrations, or application code here.

---

## 1. Entity model

| Entity | Responsibility |
|--------|----------------|
| **Employee** | Identity, org attributes, employment status **[C]** |
| **Department** | Org unit for filters/analytics **[C]** |
| **Country** | Work country (code + name) **[C]** |
| **User** | HR Manager login; revision attribution **[C]** |
| **Salary** | Current pay (amount, currency, version) **[C]** |
| **SalaryRevision** | Immutable history (previous/new amount & currency, effective date, change timestamp, actor) **[C]** |
| **Session** | `express-session` PG store rows **[C]** |

**Not modeled:** JobTitle (text on employee) **[A]**; FX/reporting currency (deferred) **[C]**; Role/RBAC **[C]**; payroll entities **[C]**; generic AuditLog **[A]**.

**Resolved here [C]:** no revision notes; login = unique email; no `role` column; optimistic concurrency on `Salary.version`.

---

## 2. Relationships

| Relationship | Cardinality | FK |
|--------------|-------------|-----|
| Department → Employee | 1 : N | `Employee.department_id` |
| Country → Employee | 1 : N | `Employee.country_id` |
| Employee → Salary | 1 : 0..1 | `Salary.employee_id` **UNIQUE** |
| Salary → SalaryRevision | 1 : N | `SalaryRevision.salary_id` |
| User → SalaryRevision | 1 : N | `SalaryRevision.changed_by_user_id` |
| User → Session | 1 : N **logical** | `sess.userId` in JSON; **no DB FK** **[A]** |

```mermaid
erDiagram
  DEPARTMENT ||--o{ EMPLOYEE : "has"
  COUNTRY ||--o{ EMPLOYEE : "located_in"
  EMPLOYEE ||--o| SALARY : "current"
  SALARY ||--o{ SALARY_REVISION : "history"
  USER ||--o{ SALARY_REVISION : "changed_by"

  DEPARTMENT {
    uuid id PK
    text code UK
    text name
  }
  COUNTRY {
    uuid id PK
    char code UK
    text name
  }
  EMPLOYEE {
    uuid id PK
    text employee_number UK
    text first_name
    text last_name
    text job_title
    uuid department_id FK
    uuid country_id FK
    text status
  }
  SALARY {
    uuid id PK
    uuid employee_id FK_UK
    numeric amount
    char currency
    int version
    date effective_date
  }
  SALARY_REVISION {
    uuid id PK
    uuid salary_id FK
    numeric previous_amount
    numeric new_amount
    char previous_currency
    char new_currency
    date effective_date
    timestamptz changed_at
    uuid changed_by_user_id FK
  }
  USER {
    uuid id PK
    citext email UK
    text password_hash
  }
  SESSION {
    text sid PK
    json sess
    timestamptz expire
  }
```

`SESSION` has no ER edge to `USER`. Association is application-level via `sess.userId` (connect-pg-simple shape) **[A]**.

---

## 3. Field-level schema

**Defaults [C]/[A]:** UUID PKs (`gen_random_uuid()`); money `NUMERIC(12,2)` never float; currency `CHAR(3)` ISO 4217 **[A]**; `TIMESTAMPTZ` for timestamps; `DATE` for effective dates.

### `departments`

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | Surrogate key |
| `code` | `TEXT` | NO | UNIQUE | — | Short code (e.g. `ENG`) |
| `name` | `TEXT` | NO | — | — | Display name |
| `created_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |

### `countries`

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | Surrogate key |
| `code` | `CHAR(2)` | NO | UNIQUE | — | ISO 3166-1 alpha-2 **[A]** |
| `name` | `TEXT` | NO | — | — | Display name |
| `created_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |

Currency is on salary rows, not on country.

### `employees`

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | Surrogate key |
| `employee_number` | `TEXT` | NO | UNIQUE | — | Business key |
| `first_name` | `TEXT` | NO | — | — | Search |
| `last_name` | `TEXT` | NO | — | — | Search |
| `job_title` | `TEXT` | NO | — | — | Filter/analytics |
| `department_id` | `UUID` | NO | FK → `departments.id` | — | Org unit |
| `country_id` | `UUID` | NO | FK → `countries.id` | — | Work country |
| `status` | `TEXT` | NO | CHECK (§6) | `'ACTIVE'` | Soft lifecycle **[C]** |
| `hire_date` | `DATE` | YES | — | — | Optional **[A]** |
| `created_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |

`status` **[C]:** `ACTIVE` | `INACTIVE` | `TERMINATED`.

### `users`

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | Surrogate key |
| `email` | `CITEXT` | NO | UNIQUE | — | Login **[C]** |
| `password_hash` | `TEXT` | NO | — | — | Argon2id |
| `display_name` | `TEXT` | NO | — | — | UI label |
| `is_active` | `BOOLEAN` | NO | — | `true` | Disable without delete |
| `created_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `now()` | Audit |

`CITEXT` **[A]** (or `TEXT` + unique lower index).

### `salaries`

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | Surrogate key |
| `employee_id` | `UUID` | NO | FK → `employees.id`, UNIQUE | — | One current salary |
| `amount` | `NUMERIC(12,2)` | NO | CHECK `> 0` | — | Current amount |
| `currency` | `CHAR(3)` | NO | CHECK format | — | ISO 4217 |
| `effective_date` | `DATE` | NO | — | — | Business effective date |
| `version` | `INTEGER` | NO | CHECK `>= 1` | `1` | OCC token **[C]** |
| `created_at` | `TIMESTAMPTZ` | NO | — | `now()` | First assignment |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `now()` | Last update |

### `salary_revisions` (immutable)

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | Surrogate key |
| `salary_id` | `UUID` | NO | FK → `salaries.id` | — | Parent salary |
| `previous_amount` | `NUMERIC(12,2)` | YES | null or `> 0` | — | Null on first assign |
| `previous_currency` | `CHAR(3)` | YES | null or format | — | Null iff previous amount null |
| `new_amount` | `NUMERIC(12,2)` | NO | `> 0` | — | After change |
| `new_currency` | `CHAR(3)` | NO | format | — | After change |
| `effective_date` | `DATE` | NO | — | — | Business date |
| `changed_at` | `TIMESTAMPTZ` | NO | — | `now()` | Change timestamp |
| `changed_by_user_id` | `UUID` | NO | FK → `users.id` | — | HR actor |
| `created_at` | `TIMESTAMPTZ` | NO | — | `now()` | Insert time |

No `updated_at`. Requirements map: previous/new amount → those columns; currency → previous+new currency; effective date; `changed_at`.

### `session` **[A]**

| Field | Type | Null | Constraints | Default | Explanation |
|-------|------|------|-------------|---------|-------------|
| `sid` | `TEXT` | NO | PK | — | Session id |
| `sess` | `JSONB` | NO | — | — | Payload incl. `userId` |
| `expire` | `TIMESTAMPTZ` | NO | INDEX | — | Cleanup |

---

## 4. Salary and history

- **`salaries`:** current pay. **`salary_revisions`:** append-only **[C]**.
- **First assign:** one txn → insert salary (`version=1`) + revision (`previous_*=NULL`). Concurrent double-insert hits `employee_id` UNIQUE → HTTP 409 `SALARY_ALREADY_EXISTS` **[A]**; no orphan revision.
- **Revision:** see §5. Previous_* must come from the version successfully updated, never a stale client-only body.
- **Currency change:** allowed; store previous and new currency. Option A analytics (no FX).
- **History read:** revisions by `salary_id` ordered by `changed_at` / `effective_date`; current values always from `salaries`.
- **Future `effective_date` [A]:** metadata only; current salary updates immediately on submit (no scheduler).
- **Immutability:** no UPDATE/DELETE API for revisions; corrections = new revision **[C]**.

### Pay period: annual salary only **[C]**

All salary amounts, salary revisions, and compensation analytics represent **annual** compensation. There is no `pay_period` column; period is an application invariant, not a stored attribute. Monthly, hourly, and other period types, and any conversion between periods, are out of scope for v1.

---

## 5. Concurrency: optimistic `salaries.version` **[C]**

Low HR write contention; Prisma-friendly; maps to HTTP 409. Pessimistic `FOR UPDATE` rejected for v1 (lock duration/leak risk without clear benefit).

```text
BEGIN;
  SELECT amount, currency, version FROM salaries WHERE id = :salary_id;
  -- validate :expected_version; else ROLLBACK → conflict

  UPDATE salaries
     SET amount = :new_amount,
         currency = :new_currency,
         effective_date = :effective_date,
         version = version + 1,
         updated_at = now()
   WHERE id = :salary_id AND version = :expected_version;

  -- if rowcount = 0 → ROLLBACK → conflict (no revision)

  INSERT INTO salary_revisions (
    salary_id, previous_amount, previous_currency,
    new_amount, new_currency, effective_date, changed_at, changed_by_user_id
  ) VALUES (...);  -- previous_* from SELECT above

COMMIT;
```

Loser of a race gets 409 `SALARY_VERSION_CONFLICT` **[A]**; UI reloads version and retries. Never record incorrect historical previous values.

---

## 6. Constraints and integrity

**Unique:** `departments.code`, `countries.code`, `employees.employee_number`, `users.email`, `salaries.employee_id`.

**Checks [A]:** status enum; amounts `> 0`; currency `^[A-Z]{3}$`; version `>= 1`; previous_* both null or both set/valid.

**ON DELETE RESTRICT [C]** on all domain FKs (department, country, salary→employee, revision→salary, revision→user). Prefer employee `status` over DELETE. Never cascade-delete history.

---

## 7. Indexes

| Index | Why |
|-------|-----|
| `employees (employee_number)` UNIQUE | Lookup |
| `employees (last_name, first_name)` | Name search/sort |
| `employees (country_id)` | Filter + analytics |
| `employees (department_id)` | Filter + analytics |
| `employees (job_title)` | Filter/group |
| `employees (status)` | Active lists |
| `salaries (employee_id)` UNIQUE | Current salary |
| `salary_revisions (salary_id, changed_at DESC)` | History |
| `salary_revisions (salary_id, effective_date DESC)` | History by effective date |
| `users (email)` UNIQUE | Login |
| `session (expire)` | Session cleanup **[A]** |

Add composite analytics indexes only if `EXPLAIN` warrants at 10k **[A]**.

---

## 8. Currency policy (Option A) **[C]**

Every amount has a currency column. No `exchange_rates` table. Aggregates `GROUP BY currency` or filter one currency. Service blocks cross-currency `SUM`.

---

## 9. Seed data

| Target | Design |
|--------|--------|
| Employees | 10,000 deterministic rows **[C]** |
| Countries / departments / titles | Multiple codes; finite title pool **[A]** |
| Salaries | One current salary per seeded active employee; varied bands/currencies |
| Revisions | Optional 0–N history for demos **[A]** |
| HR user | ≥1 active user; documented demo email + Argon2id hash |

Fixed RNG seed; synthetic names only (no real PII); `E000001`…`E010000`; mostly `ACTIVE` **[A]**. Truncate/reseed is destructive to local data **[A]**.

---

## 10. Transactions

| Operation | Boundary |
|-----------|----------|
| Employee create/update | Employee row (salary only if same request → salary txn) |
| Initial salary | Insert salary + first revision **atomic** |
| Salary revision | Versioned update + revision insert **atomic**; abort on mismatch |
| Login / logout | Session store write / destroy |
| Disable user | `is_active=false`; force session revoke **[U]** |

---

## 11. Open items

**Still [U]:** session TTL; CSRF wire details; cookie attributes; password-change/session revoke; HR seed count beyond ≥1; hosting/backups; BFF contingency; deferred FX.

**Assumptions [A]:** ISO country/currency codes; `CITEXT` email; connect-pg-simple session shape; optional `hire_date`; HTTP 409 codes above; job title as text.

---

## 12. Trade-offs

| Choice | Why |
|--------|-----|
| Current salary + revision table | Simple reads; clear OCC target vs derive-current-from-events |
| OCC `version` | Fits low contention and 409 UX vs `FOR UPDATE` |
| UUID PKs | Opaque IDs; fine at 10k |
| Normalized country/department | Stable filters vs free text |
| Soft status + RESTRICT | Preserve history vs cascade deletes |
| Immediate apply + future effective date as label | Avoid payroll-like scheduler |
| Session without user FK | Match express-session PG store |
