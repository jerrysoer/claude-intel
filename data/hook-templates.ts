import type { HookTemplate } from "./types";

export const HOOK_TEMPLATES: HookTemplate[] = [
  // ── Universal hooks (always recommended) ──

  {
    id: "secret-detection",
    name: "Secret Detection Guard",
    description:
      "Scans every file write for API keys, tokens, and passwords. Blocks the edit before secrets reach your codebase.",
    category: "universal",
    trigger: "PostToolUse",
    matcher: "Write|Edit",
    action: "block",
    script: `#!/bin/bash
# Secret Detection Guard — blocks writes containing API keys, tokens, or passwords
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip non-file operations
[ -z "$FILE" ] && exit 0

# Skip lock files and binary-adjacent files
case "$FILE" in
  *.lock|*.png|*.jpg|*.ico|*.woff*) exit 0 ;;
esac

# Get the content that was written
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
[ -z "$CONTENT" ] && exit 0

# Check for common secret patterns
if echo "$CONTENT" | grep -qEi '(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|password\\s*[:=]\\s*["\x27][^"\x27]{8,})'; then
  echo "BLOCKED: Potential secret detected in $FILE" >&2
  echo "Review the content before committing." >&2
  exit 2
fi

exit 0`,
    icon: "ShieldAlert",
  },

  {
    id: "console-cleanup",
    name: "Console.log Cleanup",
    description:
      "Flags console.log statements added to production code. Warns so you can decide — useful for debugging, noisy in production.",
    category: "universal",
    trigger: "PostToolUse",
    matcher: "Write|Edit",
    action: "warn",
    script: `#!/bin/bash
# Console.log Cleanup — warns when console.log is added to source files
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip non-file operations
[ -z "$FILE" ] && exit 0

# Only check source files
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

# Skip test files
case "$FILE" in
  *.test.*|*.spec.*|*__tests__*) exit 0 ;;
esac

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
[ -z "$CONTENT" ] && exit 0

COUNT=$(echo "$CONTENT" | grep -c 'console\\.log' || true)
if [ "$COUNT" -gt 0 ]; then
  echo "WARNING: $COUNT console.log statement(s) added to $FILE" >&2
  echo "Consider removing before committing." >&2
  exit 1
fi

exit 0`,
    icon: "MessageSquareWarning",
  },

  // ── Stack-specific hooks ──

  {
    id: "env-format",
    name: ".env.local Enforcer",
    description:
      "Blocks writes to .env (which is committed to git). In Next.js, secrets belong in .env.local (gitignored by default).",
    category: "stack",
    trigger: "PostToolUse",
    matcher: "Write|Edit",
    action: "block",
    script: `#!/bin/bash
# .env.local Enforcer — blocks writes to .env, redirects to .env.local
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE" ] && exit 0

# Check if writing to bare .env (not .env.local, .env.example, etc.)
BASENAME=$(basename "$FILE")
if [ "$BASENAME" = ".env" ]; then
  echo "BLOCKED: Writing to .env is not safe — it's committed to git." >&2
  echo "Use .env.local instead (gitignored by default in Next.js)." >&2
  exit 2
fi

exit 0`,
    icon: "FileKey",
  },

  {
    id: "rls-reminder",
    name: "Supabase RLS Reminder",
    description:
      "Warns when SQL migrations create tables without enabling Row Level Security. New Supabase tables have RLS disabled by default.",
    category: "stack",
    trigger: "PostToolUse",
    matcher: "Write|Edit",
    action: "warn",
    script: `#!/bin/bash
# Supabase RLS Reminder — warns when CREATE TABLE lacks RLS
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE" ] && exit 0

# Only check SQL migration files
case "$FILE" in
  *.sql) ;;
  *) exit 0 ;;
esac

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
[ -z "$CONTENT" ] && exit 0

# Check for CREATE TABLE without ALTER TABLE ... ENABLE ROW LEVEL SECURITY
if echo "$CONTENT" | grep -qi 'CREATE TABLE' && ! echo "$CONTENT" | grep -qi 'ENABLE ROW LEVEL SECURITY'; then
  echo "WARNING: CREATE TABLE detected without ENABLE ROW LEVEL SECURITY" >&2
  echo "New Supabase tables have RLS disabled by default. Add:" >&2
  echo "  ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;" >&2
  exit 1
fi

exit 0`,
    icon: "DatabaseZap",
  },

  // ── Data-driven hooks ──

  {
    id: "cost-alert",
    name: "Session Cost Alert",
    description:
      "Notifies you when a session's estimated cost exceeds a threshold. Helps catch runaway sessions before they get expensive.",
    category: "data-driven",
    trigger: "Notification",
    matcher: "stop_*",
    action: "warn",
    script: `#!/bin/bash
# Session Cost Alert — warns when session cost exceeds threshold
INPUT=$(cat)

# Extract session cost from notification data
COST=$(echo "$INPUT" | jq -r '.session.cost // 0')
THRESHOLD=5.00  # Adjust this threshold to your comfort level

# Compare using awk for floating point
EXCEEDS=$(awk "BEGIN { print ($COST > $THRESHOLD) }")
if [ "$EXCEEDS" = "1" ]; then
  echo "COST ALERT: This session cost ~\\$$(printf '%.2f' "$COST")" >&2
  echo "Threshold: \\$$THRESHOLD — consider using Sonnet for routine tasks." >&2
  exit 1
fi

exit 0`,
    icon: "DollarSign",
  },

  {
    id: "session-checkpoint",
    name: "Session Checkpoint",
    description:
      "Nudges you after long sessions (50+ turns) to review progress. Long sessions can drift — a checkpoint helps refocus.",
    category: "data-driven",
    trigger: "Notification",
    matcher: "stop_*",
    action: "warn",
    script: `#!/bin/bash
# Session Checkpoint — warns after long sessions
INPUT=$(cat)

TURNS=$(echo "$INPUT" | jq -r '.session.turns // 0')
THRESHOLD=50  # Adjust based on your workflow

if [ "$TURNS" -gt "$THRESHOLD" ]; then
  echo "SESSION CHECKPOINT: $TURNS turns in this session." >&2
  echo "Consider reviewing your progress and starting a fresh session." >&2
  exit 1
fi

exit 0`,
    icon: "Timer",
  },
];

/** Look up a hook template by ID */
export function getHookTemplate(id: string): HookTemplate | undefined {
  return HOOK_TEMPLATES.find((h) => h.id === id);
}
