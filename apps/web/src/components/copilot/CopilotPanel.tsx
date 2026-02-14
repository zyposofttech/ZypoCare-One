"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { ChatTab } from "./ChatTab";
import { AlertsTab } from "./AlertsTab";
import { GuideTab } from "./GuideTab";
import { ComplianceHelpTab } from "./ComplianceHelpTab";
import { ComplianceWhatsNextTab } from "./ComplianceWhatsNextTab";
import { ComplianceGlossaryTab } from "./ComplianceGlossaryTab";
import { ComplianceChatTab } from "./ComplianceChatTab";
import {
  MessageSquare,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  ListChecks,
  Sparkles,
} from "lucide-react";

/* ── Infrastructure tabs (shown on non-compliance pages) ──────────────── */
const INFRA_TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "guide", label: "Guide", icon: BookOpen },
] as const;

/* ── Compliance tabs (shown on compliance pages) ──────────────────────── */
const COMPLIANCE_TABS = [
  { id: "help", label: "Help", icon: HelpCircle },
  { id: "guide", label: "Guide", icon: ListChecks },
  { id: "glossary", label: "Glossary", icon: BookOpen },
  { id: "chat", label: "Ask AI", icon: MessageSquare },
] as const;

export function CopilotPanel({ onClose }: { onClose: () => void }) {
  const {
    activeTab, setActiveTab, health,
    isCompliancePage, compliancePageHelp,
  } = useCopilot();

  const blockerCount = health?.totalBlockers ?? 0;
  const warningCount = health?.totalWarnings ?? 0;

  const tabs = isCompliancePage ? COMPLIANCE_TABS : INFRA_TABS;

  // Ensure activeTab is valid for current tab set
  const validTabIds = tabs.map((t) => t.id) as readonly string[];
  const currentTab = validTabIds.includes(activeTab) ? activeTab : tabs[0].id;

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col",
        "border-l border-zinc-200 dark:border-zinc-800",
        "bg-white dark:bg-zinc-950",
        "shadow-2xl",
        "animate-in slide-in-from-right duration-200"
      )}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4">
        <div className="flex items-center gap-2">
          {isCompliancePage ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          ) : (
            <svg
              className="h-5 w-5 text-indigo-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          )}
          <div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {isCompliancePage ? "Compliance AI Help" : "Zypo Copilot"}
            </span>
            {isCompliancePage && compliancePageHelp ? (
              <p className="text-[10px] text-zinc-500 -mt-0.5">
                {compliancePageHelp.pageTitle}
              </p>
            ) : health ? (
              <p className="text-[10px] -mt-0.5">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                    health.overallHealth === "EXCELLENT" &&
                      "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
                    health.overallHealth === "GOOD" &&
                      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
                    health.overallHealth === "NEEDS_ATTENTION" &&
                      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                    health.overallHealth === "CRITICAL" &&
                      "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  )}
                >
                  {health.overallHealth.replace("_", " ")}
                </span>
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close copilot"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab bar — pill / capsule style */}
      <div className="mx-3 mt-3 mb-2 flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-[11px] font-medium transition-all duration-200",
                isActive
                  ? isCompliancePage
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                    : "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {/* Alert badge — only for infra alerts tab */}
              {!isCompliancePage && tab.id === "alerts" && (blockerCount + warningCount) > 0 && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                    isActive
                      ? "bg-white/25 text-white"
                      : blockerCount > 0
                        ? "bg-red-500 text-white"
                        : "bg-amber-500 text-white"
                  )}
                >
                  {blockerCount + warningCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isCompliancePage ? (
          <>
            {currentTab === "help" && <ComplianceHelpTab />}
            {currentTab === "guide" && <ComplianceWhatsNextTab />}
            {currentTab === "glossary" && <ComplianceGlossaryTab />}
            {currentTab === "chat" && <ComplianceChatTab />}
          </>
        ) : (
          <>
            {currentTab === "chat" && <ChatTab />}
            {currentTab === "alerts" && <AlertsTab />}
            {currentTab === "guide" && <GuideTab />}
          </>
        )}
      </div>
    </div>
  );
}
