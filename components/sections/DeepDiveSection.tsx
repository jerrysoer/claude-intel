"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import type { IntelPayload, SessionDetail } from "@/data/types";
import SectionWrapper from "@/components/shared/SectionWrapper";

type SortKey = "date" | "project" | "model" | "turnCount" | "totalTokens" | "estimatedCost";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCost(n: number): string {
  if (n >= 100) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ColumnDef {
  key: SortKey;
  label: string;
  shortLabel: string;
  align: "left" | "right";
  render: (s: SessionDetail) => string;
}

const COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date", shortLabel: "Date", align: "left", render: (s) => formatDate(s.date) },
  { key: "project", label: "Project", shortLabel: "Project", align: "left", render: (s) => s.project },
  { key: "model", label: "Model", shortLabel: "Model", align: "left", render: (s) => s.model },
  { key: "turnCount", label: "Turns", shortLabel: "Turns", align: "right", render: (s) => s.turnCount.toLocaleString() },
  { key: "totalTokens", label: "Tokens", shortLabel: "Tokens", align: "right", render: (s) => formatTokens(s.totalTokens) },
  { key: "estimatedCost", label: "Cost", shortLabel: "Cost", align: "right", render: (s) => formatCost(s.estimatedCost) },
];

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return <ArrowUpDown size={12} className="ml-1 inline opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="ml-1 inline" />
    : <ChevronDown size={12} className="ml-1 inline" />;
}

export default function DeepDiveSection({ data }: { data: IntelPayload }) {
  const { sessions } = data;
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.project.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q) ||
        s.date.includes(q)
    );
  }, [sessions, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      const key = sortKey;
      const aVal = a[key];
      const bVal = b[key];
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (!sessions || sessions.length === 0) return null;

  return (
    <SectionWrapper id="deep-dive" layout="full-bleed">
      <div className="mb-8 text-center">
        <p className="mb-2 font-sans text-sm uppercase tracking-widest text-text-tertiary">
          Session Explorer
        </p>
        <h2 className="font-serif text-3xl font-bold text-text-primary sm:text-4xl">
          Deep Dive
        </h2>
        <p className="mt-3 font-sans text-base text-text-secondary">
          Every session, sortable and searchable.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 mx-auto max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Filter by project, model, or date..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="w-full rounded-lg border border-border bg-bg-card py-2.5 pl-10 pr-4 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:border-text-tertiary focus:outline-none"
        />
      </div>

      {/* Count */}
      <p className="mb-4 text-center font-mono text-xs text-text-tertiary">
        {sorted.length} session{sorted.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wider text-text-tertiary transition-colors hover:text-text-secondary ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="hidden sm:inline">{col.label}</span>
                  <span className="sm:hidden">{col.shortLabel}</span>
                  <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((session, i) => (
              <tr
                key={session.sessionId || i}
                className="border-b border-border/50 transition-colors hover:bg-bg-secondary/50"
              >
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 font-mono text-sm text-text-secondary ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.key === "estimatedCost" ? "font-semibold text-text-primary" : ""}`}
                  >
                    {col.key === "project" ? (
                      <span className="max-w-[200px] truncate block" title={session.project}>
                        {session.project}
                      </span>
                    ) : col.key === "model" ? (
                      <span className="max-w-[140px] truncate block" title={session.model}>
                        {session.model}
                      </span>
                    ) : (
                      col.render(session)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-lg border border-border bg-bg-card px-6 py-2.5 font-sans text-sm font-medium text-text-secondary transition-all hover:border-text-tertiary/40 hover:text-text-primary"
          >
            Load more ({sorted.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </SectionWrapper>
  );
}
