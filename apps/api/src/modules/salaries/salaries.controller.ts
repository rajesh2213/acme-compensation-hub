import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { sendSuccess } from "../../lib/response.js";
import type {
  AssignSalaryBody,
  ListRevisionsQuery,
  ReviseSalaryBody,
} from "./salaries.schemas.js";
import {
  assignSalary,
  getCurrentSalary,
  listSalaryRevisions,
  reviseSalary,
} from "./salaries.service.js";

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
  return req.user.id;
}

export async function getSalary(req: Request, res: Response): Promise<void> {
  const { employeeId } = req.params as { employeeId: string };
  const salary = await getCurrentSalary(employeeId);
  sendSuccess(res, { salary });
}

export async function createSalary(req: Request, res: Response): Promise<void> {
  const { employeeId } = req.params as { employeeId: string };
  const body = req.body as AssignSalaryBody;
  const salary = await assignSalary(employeeId, body, requireUserId(req));
  sendSuccess(res, { salary }, 201);
}

export async function updateSalary(req: Request, res: Response): Promise<void> {
  const { employeeId } = req.params as { employeeId: string };
  const body = req.body as ReviseSalaryBody;
  const salary = await reviseSalary(employeeId, body, requireUserId(req));
  sendSuccess(res, { salary });
}

export async function listRevisions(req: Request, res: Response): Promise<void> {
  const { employeeId } = req.params as { employeeId: string };
  const query = req.query as unknown as ListRevisionsQuery;
  const result = await listSalaryRevisions(employeeId, query);
  sendSuccess(res, result);
}
