import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import { listCountries } from "./countries.service.js";

export async function list(_req: Request, res: Response): Promise<void> {
  const countries = await listCountries();
  sendSuccess(res, { countries });
}
