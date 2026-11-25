# ACME Compensation Hub

ACME Compensation Hub is a web application for HR managers to manage employee records, track salary changes, and understand compensation across countries and departments.

## Features

- **Employee management:** Create, update, search, filter, sort, and paginate employee records.
- **Salary management:** Assign initial salaries, record salary revisions, and view salary history.
- **Compensation analytics:** View headcount, employee distributions, and salary statistics grouped by currency.
- **Multi-country support:** Manage employees across countries, departments, and currencies.
- **Authentication:** HR access protected by session-based authentication and CSRF protection.

## Technology Stack

| Layer                    | Technologies                             |
| ------------------------ | ---------------------------------------- |
| Monorepo                 | pnpm workspaces                          |
| Frontend                 | Next.js, React, TypeScript, Tailwind CSS |
| Backend                  | Node.js, Express, TypeScript             |
| ORM                      | Prisma                                   |
| Database                 | PostgreSQL                               |
| Frontend data management | TanStack Query                           |
| Forms and validation     | React Hook Form, Zod                     |
| Testing                  | Vitest, Supertest, React Testing Library |

## Prerequisites

- Node.js 20.9+ (Node.js 22 recommended)
- pnpm 12+
- PostgreSQL 16+

## Installation

Clone the repository and install dependencies:

```
pnpm install
```

Configure the environment files:

- `apps/api/.env.example` → `apps/api/.env`
- `apps/web/.env.example` → `apps/web/.env.local`

Create a local PostgreSQL database:

```
CREATE DATABASE acme_compensation_hub;
```

Set `DATABASE_URL` in `apps/api/.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/acme_compensation_hub?schema=public"
```

Generate Prisma Client and apply the database migrations:

```
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

## Running the Application

Start both applications from the repository root:

```
pnpm dev
```

The applications run at:

| Application | URL                                            |
| ----------- | ---------------------------------------------- |
| Web         | [http://localhost:3000](http://localhost:3000) |
| API         | [http://localhost:4000](http://localhost:4000) |

You can also start them separately:

```
pnpm dev:web
pnpm dev:api
```

The frontend uses a Next.js rewrite to forward `/api` requests to the backend during local development.

## Application Overview

### Employee Management

The employee directory supports:

- Server-side pagination.
- Search by employee number and name.
- Filtering by country, department, job title, and employment status.
- Sorting by supported employee fields.
- Employee creation and editing.
- Employee detail pages with current compensation information.

### Salary Management

Salary management is available from employee detail pages.

- Assign an initial annual salary.
- Revise an existing salary.
- View salary revision history.
- Record the effective date and user responsible for each change.
- Handle concurrent updates using optimistic concurrency control.

Salary changes update the current salary and append a revision record within a database transaction.

### Compensation Analytics

The overview dashboard provides:

- Total employee headcount and employment status breakdown.
- Employee distribution by country and department.
- Compensation statistics, including minimum, maximum, and average salary.
- Country and department compensation breakdowns.
- Filtering by country, department, and employment status.

Compensation figures are grouped by currency. The application does not combine amounts across different currencies or perform foreign exchange conversion.

## API Overview

All application endpoints are under `/api/v1`.

### Health and readiness

| Method | Endpoint        | Description        |
| ------ | --------------- | ------------------ |
| GET    | `/health`       | API liveness       |
| GET    | `/health/ready` | Database readiness |
| GET    | `/api/v1`       | API information    |

### Authentication

| Method | Endpoint              | Description                    |
| ------ | --------------------- | ------------------------------ |
| GET    | `/api/v1/auth/csrf`   | Obtain CSRF token              |
| POST   | `/api/v1/auth/login`  | Authenticate HR user           |
| GET    | `/api/v1/auth/me`     | Get current authenticated user |
| POST   | `/api/v1/auth/logout` | End authenticated session      |

### Employees

| Method | Endpoint                | Description                  |
| ------ | ----------------------- | ---------------------------- |
| GET    | `/api/v1/employees`     | Paginated employee directory |
| GET    | `/api/v1/employees/:id` | Employee details             |
| POST   | `/api/v1/employees`     | Create employee              |
| PATCH  | `/api/v1/employees/:id` | Update employee              |

### Salaries

| Method | Endpoint                                         | Description           |
| ------ | ------------------------------------------------ | --------------------- |
| GET    | `/api/v1/employees/:employeeId/salary`           | Get current salary    |
| POST   | `/api/v1/employees/:employeeId/salary`           | Assign initial salary |
| PATCH  | `/api/v1/employees/:employeeId/salary`           | Revise salary         |
| GET    | `/api/v1/employees/:employeeId/salary/revisions` | Get salary history    |

### Analytics

| Method | Endpoint                         | Description                            |
| ------ | -------------------------------- | -------------------------------------- |
| GET    | `/api/v1/analytics/overview`     | Headcount and employee distributions   |
| GET    | `/api/v1/analytics/compensation` | Compensation statistics and breakdowns |

Employee and salary mutations require an authenticated session and a valid CSRF token.

## Authentication and Security

The application uses PostgreSQL-backed sessions through `express-session` and `connect-pg-simple`.

Security measures include:

- HttpOnly session cookies.
- SameSite=Lax cookie policy.
- Secure cookies in production.
- CSRF synchronizer tokens for state-changing requests.
- Trusted Origin validation.
- Argon2id password hashing.
- Authentication checks against the database.
- Login rate limiting.

Session identifiers and credentials are not stored in browser `localStorage`.

The login rate limiter is in-memory and operates per API process. It is not shared across multiple instances.

## Database and Seed Data

The database uses PostgreSQL and Prisma.

The schema includes:

- Country
- Department
- Employee
- User
- Salary
- SalaryRevision
- Session

Salary amounts use PostgreSQL `NUMERIC(12,2)` to preserve decimal precision.

Annual salary is the application's compensation unit. Currency is stored explicitly using ISO 4217 codes.

### Seed Data

The deterministic seed script creates synthetic data for testing and development.

Expected counts after a fresh seed:

| Entity           | Approximate count |
| ---------------- | ----------------- |
| Countries        | 8                 |
| Departments      | 8                 |
| Employees        | 10,000            |
| Salaries         | 9,200             |
| Salary revisions | 9,275             |
| HR users         | At least 1        |

The seed generates synthetic employee records and salary data. It can be run repeatedly without creating duplicate records.

Configure the HR account in `apps/api/.env`:

```
SEED_HR_EMAIL="hr.demo@acme.local"
SEED_HR_PASSWORD="change-me-local-only"
SEED_HR_DISPLAY_NAME="Demo HR Manager"
```

Run the seed:

```
pnpm --filter api prisma:seed
```

To perform a destructive local reseed:

```
$env:SEED_RESET="true"
pnpm --filter api prisma:seed
```

Destructive reseeding and production seeding are refused when `NODE_ENV=production`.

## Testing

Run backend tests:

```
pnpm --filter api test
```

Run frontend tests:

```
pnpm --filter web test
```

Run the complete typecheck:

```
pnpm typecheck
```

Build both applications:

```
pnpm build
```

## Prisma Commands

The API workspace provides the following database commands:

```
pnpm --filter api prisma:generate
pnpm --filter api prisma:validate
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
pnpm --filter api prisma:studio
```

Production database changes should be applied through Prisma migrations. Do not use `prisma db push` against the production database.

## Deployment

| Layer | Host |
| ----- | ---- |
| Frontend | Vercel Hobby |
| API | Render Free |
| Database | Neon Free Postgres |


### Cold starts

After idle time, the first request can take **~30–60 seconds**

| Layer | Idle behavior |
| ----- | ------------- |
| Render Free API | Sleeps after ~**15 minutes**; cold start often ~**1 minute** |
| Neon Free | Scales to zero after ~**5 minutes**; first DB query adds wake latency |

That delay can show up on **login** as well as Overview/Employees, because auth bootstraps via `/api/v1/auth/me` through the same API.
