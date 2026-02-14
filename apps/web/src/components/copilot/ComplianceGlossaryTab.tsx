"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { Search, ChevronRight } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  ABDM: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  NABH: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
  Schemes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  General: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function ComplianceGlossaryTab() {
  const {
    complianceGlossary: glossary,
    complianceGlossaryLoading: glossaryLoading,
    searchComplianceGlossary: searchGlossary,
  } = useCopilot();
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timeout = setTimeout(() => { searchGlossary(search); }, 300);
    return () => clearTimeout(timeout);
  }, [search, searchGlossary]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..."
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-1.5">
        {glossaryLoading && glossary.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          </div>
        )}
        {!glossaryLoading && glossary.length === 0 && (
          <p className="text-center text-sm text-zinc-500 py-8">No matching terms found.</p>
        )}
        {glossary.map((entry) => (
          <div key={entry.term} className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === entry.term ? null : entry.term)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase",
                  CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.General,
                )}>
                  {entry.category}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {entry.term}
                </span>
              </div>
              <ChevronRight className={cn(
                "h-3.5 w-3.5 text-zinc-400 transition-transform shrink-0",
                expanded === entry.term && "rotate-90",
              )} />
            </button>
            {expanded === entry.term && (
              <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 italic">{entry.shortDef}</p>
                <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{entry.longDef}</p>
                {entry.relatedTerms.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[10px] text-zinc-500 mr-1">Related:</span>
                    {entry.relatedTerms.map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => { setSearch(rt); setExpanded(null); }}
                        className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
