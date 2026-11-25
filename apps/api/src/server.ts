import { createApp } from "./app.js";
import { loadEnv } from "./env.js";

export function startServer(): void {
  const env = loadEnv();
  const app = createApp();

  // Bind all interfaces for PaaS (Render Free, etc.). PORT comes from the platform.
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`API listening on 0.0.0.0:${env.port}`);
  });
}
