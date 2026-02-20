import express from "express";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { aggregate } from "../lib/aggregator";

export function startServer(port: number, outDir: string): void {
  const app = express();
  app.use(express.json());

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  const dataPath = join(outDir, "data.json");

  // API: serve aggregated data
  app.get("/api/data", (_req, res) => {
    try {
      const raw = readFileSync(dataPath, "utf-8");
      res.type("json").send(raw);
    } catch {
      res.status(404).json({ error: "data.json not found — run aggregator first" });
    }
  });

  // API: re-run aggregator and return fresh data
  app.post("/api/refresh", async (_req, res) => {
    try {
      const data = await aggregate();
      writeFileSync(dataPath, JSON.stringify(data, null, 2));
      res.json(data);
    } catch (err) {
      console.error("Refresh failed:", err);
      res.status(500).json({ error: "Failed to refresh data" });
    }
  });

  // Serve static files (Next.js export)
  app.use(express.static(outDir));

  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`claude-intel dashboard → http://127.0.0.1:${port}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Try: npx claude-intel --port ${port + 1}`);
      process.exit(1);
    }
    throw err;
  });
}
