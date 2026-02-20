#!/usr/bin/env node
import { program } from "commander";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { aggregate } from "../lib/aggregator";

program
  .name("claude-intel")
  .description("Claude Code usage intelligence dashboard")
  .version("0.1.0")
  .option("--from <date>", "start date (YYYY-MM-DD)")
  .option("--to <date>", "end date (YYYY-MM-DD)")
  .option("--port <number>", "server port", "3737")
  .option("--no-open", "do not open browser")
  .option("--mcp", "start MCP server instead of dashboard")
  .parse();

const opts = program.opts<{
  from?: string;
  to?: string;
  port: string;
  open: boolean;
  mcp: boolean;
}>();

async function main() {
  if (opts.mcp) {
    const { startMCPServer } = await import("../mcp/server");
    await startMCPServer();
    return;
  }

  // Run aggregator
  console.log("Aggregating Claude Code usage data...");
  const data = await aggregate(opts.from, opts.to);

  // Write to out/data.json
  const outDir = join(process.cwd(), "out");
  mkdirSync(outDir, { recursive: true });
  const dataPath = join(outDir, "data.json");
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${dataPath}`);

  // Start server
  const port = parseInt(opts.port, 10);
  const { startServer } = await import("../server/index");
  startServer(port, outDir);

  // Open browser
  if (opts.open) {
    try {
      const openModule = await import("open");
      const openFn = openModule.default;
      await openFn(`http://127.0.0.1:${port}`);
    } catch {
      // open package not available or failed — not critical
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
