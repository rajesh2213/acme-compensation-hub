import express, { type Express } from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { csrfProtection } from "./middleware/csrf.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { createSessionMiddleware } from "./middleware/session.js";
import { healthRouter } from "./routes/health.routes.js";
import { v1Router } from "./routes/v1/index.js";

export type CreateAppOptions = {
  /** Register extra routes before not-found/error handlers (tests). */
  configure?: (app: Express) => void;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.disable("x-powered-by");
  // Trust one reverse-proxy hop so req.ip reflects the client (same-site proxy topology).
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(createSessionMiddleware());
  app.use(csrfProtection());

  app.use(healthRouter);
  app.use("/api/v1", v1Router);

  options.configure?.(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
