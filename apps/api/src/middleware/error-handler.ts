import type { NextFunction, Request, Response } from "express";
import { AppError, isAppError } from "../lib/errors.js";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
};

type BodyParserLikeError = {
  type?: string;
  status?: number;
  statusCode?: number;
};

function mapBodyParserError(error: unknown): AppError | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const typed = error as BodyParserLikeError;

  if (typed.type === "entity.parse.failed") {
    return new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
  }

  if (typed.type === "entity.too.large") {
    return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  return null;
}

function logError(error: unknown, requestId: string): void {
  if (isAppError(error) && error.statusCode < 500 && error.expose) {
    console.warn(
      JSON.stringify({
        level: "warn",
        requestId,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      }),
    );
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      name: err.name,
      message: err.message,
      // Stack only in server logs — never sent to clients in production.
      stack: err.stack,
    }),
  );
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? "unknown";
  const mapped = mapBodyParserError(error);
  const normalized = mapped ?? error;

  logError(normalized, requestId);

  const isProduction = process.env.NODE_ENV === "production";

  if (isAppError(normalized)) {
    const body: ErrorBody = {
      error: {
        code: normalized.code,
        message: normalized.expose
          ? normalized.message
          : "An unexpected error occurred",
        requestId,
      },
    };

    if (normalized.expose && normalized.details !== undefined) {
      body.error.details = normalized.details;
    }

    res.status(normalized.statusCode).json(body);
    return;
  }

  const body: ErrorBody = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProduction ? "An unexpected error occurred" : "Internal server error",
      requestId,
    },
  };

  if (!isProduction && normalized instanceof Error) {
    body.error.details = { name: normalized.name, message: normalized.message };
  }

  res.status(500).json(body);
}
