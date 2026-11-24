import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import type {
  CreateEmployeeBody,
  ListEmployeesQuery,
  UpdateEmployeeBody,
} from "./employees.schemas.js";
import {
  createEmployee,
  getEmployeeById,
  listEmployees,
  updateEmployee,
} from "./employees.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListEmployeesQuery;
  const result = await listEmployees(query);
  sendSuccess(res, result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const employee = await getEmployeeById(id);
  sendSuccess(res, { employee });
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateEmployeeBody;
  const employee = await createEmployee(body);
  sendSuccess(res, { employee }, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateEmployeeBody;
  const employee = await updateEmployee(id, body);
  sendSuccess(res, { employee });
}
