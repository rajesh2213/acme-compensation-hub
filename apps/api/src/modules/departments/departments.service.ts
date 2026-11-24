import { prisma } from "../../db/prisma.js";

export type DepartmentLookupDto = {
  id: string;
  code: string;
  name: string;
};

export async function listDepartments(): Promise<DepartmentLookupDto[]> {
  return prisma.department.findMany({
    select: { id: true, code: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}
