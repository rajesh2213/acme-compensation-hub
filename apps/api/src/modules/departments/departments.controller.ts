import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import { listDepartments } from "./departments.service.js";

export async function list(_req: Request, res: Response): Promise<void> {
  const departments = await listDepartments();
  sendSuccess(res, { departments });
}
