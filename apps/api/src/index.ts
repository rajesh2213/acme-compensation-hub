import express from "express";
import { checkDatabaseConnectivity } from "./db/prisma.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const app = express();

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
  const ready = await checkDatabaseConnectivity();

  if (ready) {
    res.status(200).json({ status: "ready" });
    return;
  }

  res.status(503).json({ status: "unavailable" });
});

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
