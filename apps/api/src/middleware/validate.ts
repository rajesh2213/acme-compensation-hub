import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors.js";

type RequestSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

function formatZodError(error: {
  issues: Array<{ path: PropertyKey[]; message: string; code: string }>;
}) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || undefined,
    message: issue.message,
    code: issue.code,
  }));
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) {
          throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
            body: formatZodError(parsed.error),
          });
        }
        req.body = parsed.data;
      }

      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) {
          throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
            query: formatZodError(parsed.error),
          });
        }
        // Express types treat query as IncomingHttpHeaders-like; assign transformed values.
        Object.defineProperty(req, "query", {
          value: parsed.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) {
          throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
            params: formatZodError(parsed.error),
          });
        }
        Object.defineProperty(req, "params", {
          value: parsed.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
