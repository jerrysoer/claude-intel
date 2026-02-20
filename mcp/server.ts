import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { aggregate } from "../lib/aggregator";

const dateRangeSchema = {
  from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  to: z.string().optional().describe("End date (YYYY-MM-DD)"),
};

export async function startMCPServer(): Promise<void> {
  const server = new McpServer({
    name: "claude-intel",
    version: "0.1.0",
  });

  // 1. Spend summary
  server.tool(
    "get_spend_summary",
    "Get total spend and token counts for a date range",
    dateRangeSchema,
    async ({ from, to }) => {
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
    }
  );

  // 2. Daily breakdown
  server.tool(
    "get_daily_breakdown",
    "Get daily cost and token breakdown",
    dateRangeSchema,
    async ({ from, to }) => {
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
    }
  );

  // 3. Model breakdown
  server.tool(
    "get_model_breakdown",
    "Get per-model cost and token split",
    dateRangeSchema,
    async ({ from, to }) => {
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
    }
  );

  // 4. Project costs
  server.tool(
    "get_project_costs",
    "Get per-project cost breakdown, optionally limited to top N",
    {
      ...dateRangeSchema,
      top: z.number().optional().describe("Return only top N projects by cost"),
    },
    async ({ from, to, top }) => {
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
    }
  );

  // 5. Compare costs (What If)
  server.tool(
    "compare_costs",
    "Compare actual Anthropic costs with hypothetical costs from other providers",
    dateRangeSchema,
    async ({ from, to }) => {
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
    }
  );

  // 6. Cache efficiency
  server.tool(
    "get_cache_efficiency",
    "Get cache hit rate and cost savings from prompt caching",
    dateRangeSchema,
    async ({ from, to }) => {
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
    }
  );

  // 7. Insights
  server.tool(
    "get_insights",
    "Get behavioral patterns and usage insights",
    dateRangeSchema,
    async ({ from, to }) => {
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
    }
  );

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
