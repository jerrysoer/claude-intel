"use client";

import { useState } from "react";
import {
  ShieldAlert,
  MessageSquareWarning,
  FileKey,
  DatabaseZap,
  DollarSign,
  Timer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  IntelPayload,
  HookRecommendation,
  HookCategory,
  DetectedProject,
} from "@/data/types";
import SectionWrapper from "@/components/shared/SectionWrapper";

// ── Icon mapping ──

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldAlert,
  MessageSquareWarning,
  FileKey,
  DatabaseZap,
  DollarSign,
  Timer,
};

// ── Category metadata ──

const CATEGORY_META: Record<HookCategory, { label: string; description: string }> = {
  universal: {
    label: "Essential",
    description: "Recommended for every project",
  },
  stack: {
    label: "For Your Stack",
    description: "Based on your detected technologies",
  },
  "data-driven": {
    label: "Based on Your Data",
    description: "Triggered by your usage patterns",
  },
};

// ── Project type display ──

const PROJECT_TYPE_LABELS: Record<string, string> = {
  nextjs: "Next.js",
  supabase: "Supabase",
  python: "Python",
  node: "Node.js",
  generic: "Generic",
};

// ── Subcomponents ──

function ProjectPills({ projects }: { projects: DetectedProject[] }) {
  // Count projects per type
  const typeCounts = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.types) {
      if (t === "generic") continue;
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
  }

  if (typeCounts.size === 0) return null;

  return (
    <div className="mb-10 flex flex-wrap justify-center gap-2">
      {Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => (
          <span
            key={type}
            className="rounded-full border border-border bg-bg-secondary px-3 py-1 font-mono text-xs font-medium text-text-secondary"
          >
            {count} {PROJECT_TYPE_LABELS[type] ?? type}
          </span>
        ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border border-border bg-bg-secondary px-2.5 py-1 font-sans text-xs font-medium text-text-secondary transition-all hover:border-text-tertiary/40 hover:text-text-primary"
      aria-label="Copy script to clipboard"
    >
      {copied ? (
        <>
          <Check size={12} /> Copied
        </>
      ) : (
        <>
          <Copy size={12} /> Copy script
        </>
      )}
    </button>
  );
}

function HookCard({ rec }: { rec: HookRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[rec.hook.icon] ?? Zap;
  const isBlock = rec.hook.action === "block";

  return (
    <div className="group rounded-xl border border-border bg-bg-card p-6 transition-all duration-200 hover:border-text-tertiary/40">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor: isBlock
                ? "color-mix(in srgb, var(--anthropic-orange) 15%, transparent)"
                : "color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
            }}
          >
            <Icon
              size={20}
              style={{
                color: isBlock
                  ? "var(--anthropic-orange)"
                  : "var(--text-secondary)",
              }}
            />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-text-primary">
              {rec.hook.name}
            </h3>
            <p className="font-mono text-xs text-text-tertiary">
              {rec.hook.trigger} &middot; {rec.hook.matcher}
            </p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: isBlock
              ? "color-mix(in srgb, var(--anthropic-orange) 12%, transparent)"
              : "color-mix(in srgb, var(--text-tertiary) 8%, transparent)",
            color: isBlock
              ? "var(--anthropic-orange)"
              : "var(--text-secondary)",
          }}
        >
          {isBlock ? "Blocks" : "Warns"}
        </span>
      </div>

      {/* Description */}
      <p className="mb-3 font-sans text-sm leading-relaxed text-text-secondary">
        {rec.hook.description}
      </p>

      {/* Personalized reasoning */}
      <div
        className="mb-4 rounded-lg p-3"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--anthropic-orange) 5%, var(--bg-secondary))",
        }}
      >
        <p className="font-sans text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">
          Why for you
        </p>
        <p className="font-sans text-sm leading-relaxed text-text-secondary">
          {rec.reasoning}
        </p>
      </div>

      {/* Expandable script */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2 font-sans text-xs font-medium text-text-secondary transition-all hover:border-text-tertiary/40 hover:text-text-primary"
        >
          <span>View bash script</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {expanded && (
          <div className="mt-2">
            <div className="flex justify-end mb-1">
              <CopyButton text={rec.hook.script} />
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-bg-secondary p-4 font-mono text-xs leading-relaxed text-text-secondary">
              {rec.hook.script}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  hooks,
}: {
  category: HookCategory;
  hooks: HookRecommendation[];
}) {
  if (hooks.length === 0) return null;

  const meta = CATEGORY_META[category];

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="font-serif text-xl font-semibold text-text-primary">
          {meta.label}
        </h3>
        <p className="font-sans text-sm text-text-tertiary">{meta.description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hooks.map((rec) => (
          <HookCard key={rec.hook.id} rec={rec} />
        ))}
      </div>
    </div>
  );
}

function InstallGuide() {
  const [open, setOpen] = useState(false);

  const exampleConfig = `// ~/.claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/secret-detection.sh"
          }
        ]
      }
    ]
  }
}`;

  return (
    <div className="mt-8 rounded-xl border border-border bg-bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-6 text-left"
      >
        <div>
          <h3 className="font-serif text-lg font-semibold text-text-primary">
            How to install hooks
          </h3>
          <p className="mt-1 font-sans text-sm text-text-tertiary">
            Save scripts and configure settings.json
          </p>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-text-tertiary" />
        ) : (
          <ChevronDown size={18} className="text-text-tertiary" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-6 pb-6 pt-4">
          <ol className="space-y-4 font-sans text-sm leading-relaxed text-text-secondary">
            <li>
              <strong className="text-text-primary">1. Save the script</strong>
              <br />
              Copy the bash script and save it to a file (e.g.,{" "}
              <code className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-xs border border-border">
                ~/.claude/hooks/secret-detection.sh
              </code>
              ). Make it executable:{" "}
              <code className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-xs border border-border">
                chmod +x ~/.claude/hooks/secret-detection.sh
              </code>
            </li>
            <li>
              <strong className="text-text-primary">
                2. Add to settings.json
              </strong>
              <br />
              Open{" "}
              <code className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-xs border border-border">
                ~/.claude/settings.json
              </code>{" "}
              and add the hook configuration:
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-bg-secondary p-3 font-mono text-xs leading-relaxed">
                {exampleConfig}
              </pre>
            </li>
            <li>
              <strong className="text-text-primary">3. Exit codes</strong>
              <br />
              <span className="font-mono">exit 0</span> = allow,{" "}
              <span className="font-mono">exit 1</span> = warn (show stderr, continue),{" "}
              <span className="font-mono">exit 2</span> = block (reject the tool
              call). The hook receives tool input as JSON on stdin.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Main section ──

export default function HooksSection({ data }: { data: IntelPayload }) {
  const { hooks, detectedProjects } = data;

  if (!hooks || hooks.length === 0) return null;

  // Group by category
  const universal = hooks.filter((h) => h.hook.category === "universal");
  const stack = hooks.filter((h) => h.hook.category === "stack");
  const dataDriven = hooks.filter((h) => h.hook.category === "data-driven");

  return (
    <SectionWrapper id="hooks" layout="centered" stagger>
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 font-sans text-sm uppercase tracking-widest text-text-tertiary">
          Automate Your Guardrails
        </p>
        <h2 className="font-serif text-3xl font-bold text-text-primary sm:text-4xl">
          Hook Recommendations
        </h2>
        <p className="mt-3 font-sans text-base text-text-secondary">
          Personalized hooks based on your projects and usage patterns.
        </p>
      </div>

      {/* Detected project pills */}
      {detectedProjects && detectedProjects.length > 0 && (
        <ProjectPills projects={detectedProjects} />
      )}

      {/* Hook cards grouped by category */}
      <CategoryGroup category="universal" hooks={universal} />
      <CategoryGroup category="stack" hooks={stack} />
      <CategoryGroup category="data-driven" hooks={dataDriven} />

      {/* Install guide */}
      <InstallGuide />
    </SectionWrapper>
  );
}
