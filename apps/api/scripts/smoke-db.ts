import { prisma } from "../src/db/prisma.js";

async function main() {
  const [departments, countries, employees, users, salaries, revisions, sessions] =
    await Promise.all([
      prisma.department.count(),
      prisma.country.count(),
      prisma.employee.count(),
      prisma.user.count(),
      prisma.salary.count(),
      prisma.salaryRevision.count(),
      prisma.session.count(),
    ]);

  console.log(
    JSON.stringify({
      departments,
      countries,
      employees,
      users,
      salaries,
      revisions,
      sessions,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
