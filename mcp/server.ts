import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { aggregate } from "../lib/aggregator";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateRangeSchema = {
  from: z
    .string()
    .regex(datePattern, "Must be YYYY-MM-DD format")
    .optional()
    .describe("Start date (YYYY-MM-DD)"),
  to: z
    .string()
    .regex(datePattern, "Must be YYYY-MM-DD format")
    .optional()
    .describe("End date (YYYY-MM-DD)"),
};

/** Wrap an MCP tool handler with error handling */
function withErrorHandling<T>(
  handler: (args: T) => Promise<{ content: { type: "text"; text: string }[] }>
) {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

export async function startMCPServer(): Promise<void> {
  const server = new McpServer({
    name: "claude-intel",
    version: "0.2.0",
  });

  // 1. Spend summary
  server.tool(
    "get_spend_summary",
    "Get total spend and token counts for a date range. Use this when the user asks how much they've spent or wants a spending overview.",
    dateRangeSchema,
    withErrorHandling(async ({ from, to }) => {
      const data = await aggregate(from, to);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                totals: data.totals,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 2. Daily breakdown
  server.tool(
    "get_daily_breakdown",
    "Get daily cost and token breakdown over time. Use this when the user wants to see spending trends, daily usage patterns, or track costs day-by-day.",
    dateRangeSchema,
    withErrorHandling(async ({ from, to }) => {
      const data = await aggregate(from, to);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                daily: data.daily,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 3. Model breakdown
  server.tool(
    "get_model_breakdown",
    "Get per-model cost and token split. Use this when the user asks which models they use most, or wants to understand their Opus vs Sonnet vs Haiku mix.",
    dateRangeSchema,
    withErrorHandling(async ({ from, to }) => {
      const data = await aggregate(from, to);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                byModel: data.byModel,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 4. Project costs
  server.tool(
    "get_project_costs",
    "Get per-project cost breakdown, optionally limited to top N. Use this when the user asks which project costs the most or wants a project-level spending report.",
    {
      ...dateRangeSchema,
      top: z.number().optional().describe("Return only top N projects by cost"),
    },
    withErrorHandling(async ({ from, to, top }) => {
      const data = await aggregate(from, to);
      let projects = data.byProject;
      if (top && top > 0) {
        projects = projects
          .sort((a, b) => b.estimatedCost - a.estimatedCost)
          .slice(0, top);
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                byProject: projects,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 5. Compare costs (What If)
  server.tool(
    "compare_costs",
    "Compare actual Anthropic costs with hypothetical costs from OpenAI, Google, and other providers. Use this when the user asks to compare providers or wants to know if they'd save money switching.",
    dateRangeSchema,
    withErrorHandling(async ({ from, to }) => {
      const data = await aggregate(from, to);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                actualCost: data.totals.estimatedCost,
                whatIf: data.whatIf,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 6. Cache efficiency
  server.tool(
    "get_cache_efficiency",
    "Get cache hit rate and cost savings from prompt caching. Use this when the user asks about caching performance or wants to know how much caching saves them.",
    dateRangeSchema,
    withErrorHandling(async ({ from, to }) => {
      const data = await aggregate(from, to);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                cacheEfficiency: data.cacheEfficiency,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 7. Insights
  server.tool(
    "get_insights",
    "Get behavioral patterns and usage insights like peak hours, marathon sessions, and model mismatch alerts. Use this when the user wants tips or patterns about their usage habits.",
    dateRangeSchema,
    withErrorHandling(async ({ from, to }) => {
      const data = await aggregate(from, to);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                dateRange: data.dateRange,
                insights: data.insights,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
