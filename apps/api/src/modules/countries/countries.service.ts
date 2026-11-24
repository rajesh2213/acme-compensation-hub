import { prisma } from "../../db/prisma.js";

export type CountryLookupDto = {
  id: string;
  code: string;
  name: string;
};

export async function listCountries(): Promise<CountryLookupDto[]> {
  return prisma.country.findMany({
    select: { id: true, code: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}
