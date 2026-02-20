import express from "express";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { aggregate } from "../lib/aggregator";

export function startServer(port: number, outDir: string): void {
  const app = express();
  app.use(express.json());

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
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  // Serve static files (Next.js export)
  app.use(express.static(outDir));

  app.listen(port, "127.0.0.1", () => {
    console.log(`claude-intel dashboard → http://127.0.0.1:${port}`);
  });
}
