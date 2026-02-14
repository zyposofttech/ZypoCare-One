"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { useRouter } from "next/navigation";
import { HelpCircle, Lightbulb, ChevronRight } from "lucide-react";

export function ComplianceHelpTab() {
  const { compliancePageHelp: pageHelp, compliancePageHelpLoading: pageHelpLoading } = useCopilot();
  const router = useRouter();

  if (pageHelpLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
        <p className="mt-3 text-xs text-zinc-500">Loading help...</p>
      </div>
    );
  }

  if (!pageHelp) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <HelpCircle className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500">Navigate to a compliance page to see contextual help.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4">
      {/* What is this page */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
            What is this page?
          </h3>
        </div>
        <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
          {pageHelp.whatIsThis}
        </p>
      </div>

      {/* How to use */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2">
          How to use this page
        </h3>
        <ol className="space-y-2">
          {pageHelp.howToUse.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Common Questions */}
      {pageHelp.commonQuestions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2">
            Common Questions
          </h3>
          <div className="space-y-2">
            {pageHelp.commonQuestions.map((faq, idx) => (
              <details key={idx} className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
                <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg">
                  {faq.q}
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-3 pb-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Related Terms */}
      {pageHelp.relatedGlossary.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2">
            Key Terms on this page
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {pageHelp.relatedGlossary.map((term) => (
              <span
                key={term.term}
                className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400"
                title={term.shortDef}
              >
                {term.term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
