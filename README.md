# Claude Intel

**Claude Intel shows you what Claude Code is actually costing — locally, privately, interactively.**

Track tokens, compare costs across providers, and discover usage patterns — all from your local Claude Code session data.

Claude Code gives you zero visibility into what you're actually spending. Claude Intel reads your local session logs, calculates costs at API rates, and serves an interactive dashboard on localhost. No data leaves your machine.

## What You Get

- **Token analytics** — Daily breakdown of input, output, and cache tokens across all projects
- **Model mix** — See how your usage splits across Opus, Sonnet, and Haiku
- **Cost Lab** — Re-price your actual usage on OpenAI, Google, and ByteDance. Simulate model rebalancing.
- **Project intel** — Per-project spending, dominant models, session counts
- **Cache efficiency** — Cache hit rate, dollars saved, what-if-uncached comparison
- **Behavioral insights** — Marathon sessions, peak hours, weekend warrior ratio, model mismatch alerts
- **Deep dive** — Sortable, searchable session table with per-turn detail
- **MCP server** — Ask Claude Code "how much have I spent?" directly in conversation

## Quick Start

```bash
npx claude-intel
```

Opens `http://localhost:3737` with your usage dashboard. Data is read from `~/.claude/projects/`.

### Options

```bash
npx claude-intel --from 2026-02-01          # custom start date
npx claude-intel --port 8080                # custom port
npx claude-intel --no-open                  # don't auto-open browser
```

## MCP Server

Add Claude Intel as an MCP server so Claude Code can answer spending questions directly:

```bash
claude mcp add claude-intel -- npx tsx /path/to/claude-intel/bin/cli.ts --mcp
```

Then ask Claude Code:

> "How much have I spent this month?"
> "Compare my costs with OpenAI."
> "What's my cache hit rate?"

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_spend_summary` | Total spend + tokens for a date range |
| `get_daily_breakdown` | Daily cost/token table |
| `get_model_breakdown` | Per-model cost/token split |
| `get_project_costs` | Per-project breakdown |
| `compare_costs` | Your tokens re-priced on other providers |
| `get_cache_efficiency` | Cache hit rate + savings |
| `get_insights` | Behavioral patterns |

All tools accept optional `from` and `to` date parameters (YYYY-MM-DD).

## How It Works

1. **Parser** (`lib/parser.ts`) — Streams JSONL files line-by-line. Only extracts `message.usage` fields. Never loads full files into memory.
2. **Aggregator** (`lib/aggregator.ts`) — Walks `~/.claude/projects/`, decodes directory names, merges sessions across projects.
3. **Cost calculator** (`lib/cost-calculator.ts`) — Applies Anthropic API pricing. "What If" engine re-prices tokens at competitor rates.
4. **Dashboard** — Next.js static export served via Express on localhost.

### Privacy

Claude Intel runs entirely on your local machine. It reads your local `~/.claude/projects/` session files and serves the dashboard on `127.0.0.1`. No data is sent to any external service.

Analytics (Umami) respects your browser's Do Not Track setting.

### Cost Disclaimer

All costs are **estimated at Anthropic API rates**. Your actual cost depends on your plan:

- **Claude Pro** ($20/mo) — Included usage with rate limits
- **Claude Max** ($100-200/mo) — Unlimited usage
- **API** — Pay per token at the rates shown

## Stack

Next.js 16 | React 19 | Tailwind CSS v4 | Recharts | Express 5 | MCP SDK

## Development

```bash
npm install
npm run dev          # Next.js dev server (port 3000)
npm run cli          # Run CLI with tsx
npm run build        # Build static export
```

## License

MIT
