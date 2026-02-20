#!/usr/bin/env node
import { program } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { aggregate } from "../lib/aggregator";

/** Find the package root (works for both tsx and compiled dist/) */
function findPackageRoot(): string {
  let dir = __dirname;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

program
  .name("claude-intel")
  .description("Claude Code usage intelligence dashboard")
  .version("0.2.0")
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

function validateDate(value: string | undefined, label: string): void {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(`Invalid ${label} date: "${value}" — expected YYYY-MM-DD`);
    process.exit(1);
  }
}

async function main() {
  validateDate(opts.from, "--from");
  validateDate(opts.to, "--to");

  if (opts.mcp) {
    const { startMCPServer } = await import("../mcp/server");
    await startMCPServer();
    return;
  }

  // Run aggregator with progress feedback
  const data = await aggregate(opts.from, opts.to, (msg) => console.log(msg));

  // Write to out/data.json (relative to package root, not cwd)
  const outDir = join(findPackageRoot(), "out");
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
