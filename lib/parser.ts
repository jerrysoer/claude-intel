import { createReadStream } from "fs";
import { createInterface } from "readline";
import type { ParsedEntry } from "@/data/types";

/**
 * Stream-based JSONL parser. Reads line-by-line, never loading
 * the full file into memory. Extracts only token usage data.
 */
export async function parseJSONLFile(
  filePath: string,
  fromDate?: string,
  toDate?: string
): Promise<ParsedEntry[]> {
  const entries: ParsedEntry[] = [];

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Fast pre-check: skip non-assistant entries without parsing
    if (!line.includes('"type":"assistant"')) continue;

    try {
      const obj = JSON.parse(line);

      if (obj.type !== "assistant") continue;
      if (!obj.message?.usage) continue;

      const timestamp = obj.timestamp as string;
      if (!timestamp) continue;

      const date = timestamp.slice(0, 10); // YYYY-MM-DD

      // Date range filtering
      if (fromDate && date < fromDate) continue;
      if (toDate && date > toDate) continue;

      const usage = obj.message.usage;
      const model = obj.message.model ?? "unknown";

      // Skip synthetic/internal entries
      if (model === "<synthetic>" || model === "unknown") continue;

      entries.push({
        timestamp,
        date,
        sessionId: obj.sessionId ?? "",
        model,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        cwd: obj.cwd ?? "",
        isSubagent: obj.isSidechain === true,
      });
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}
