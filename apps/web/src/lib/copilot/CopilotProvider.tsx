"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import type {
  BranchHealthStatus,
  ChatMessage,
  ChatResponse,
  PageContext,
} from "./types";
import type {
  ComplianceChatMessage,
  ComplianceGlossaryEntry,
  CompliancePageHelp,
  ComplianceState,
  ComplianceWhatsNext,
} from "./compliance-ai-types";

/* ─── Compliance Health type ──────────────────────────────────────────── */

export type ComplianceHealthStatus = {
  overallHealth: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  complianceScore: number;
  workflowProgress: number;
  totalBlockers: number;
  totalWarnings: number;
  topIssues: {
    id: string;
    severity: "BLOCKER" | "WARNING";
    title: string;
    category: string;
    fixHint: string;
    area: string;
  }[];
  summary: string;
  areas: Record<string, { score: number; label: string; issues: number }>;
  generatedAt: number;
};

/* ─── Context shape ────────────────────────────────────────────────────── */

type CopilotState = {
  /** Current page context (module, action, formData) */
  pageContext: PageContext | null;
  setPageContext: (ctx: PageContext | null) => void;

  /** Branch health status (refreshed every 5 min) */
  health: BranchHealthStatus | null;
  healthLoading: boolean;
  refreshHealth: () => void;

  /** Infrastructure Chat */
  messages: ChatMessage[];
  chatLoading: boolean;
  sendMessage: (text: string) => Promise<void>;

  /** Widget visibility */
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  /* ── Compliance AI fields ─────────────────────────────────────────────── */

  /** Whether the current page is a compliance page */
  isCompliancePage: boolean;

  /** Compliance page ID (e.g., "compliance-dashboard") */
  compliancePageId: string | null;
  setCompliancePageId: (id: string | null) => void;

  /** Compliance page-specific help content */
  compliancePageHelp: CompliancePageHelp | null;
  compliancePageHelpLoading: boolean;

  /** Compliance workflow steps */
  complianceWhatsNext: ComplianceWhatsNext | null;
  complianceWhatsNextLoading: boolean;

  /** Compliance state */
  complianceState: ComplianceState | null;

  /** Compliance glossary */
  complianceGlossary: ComplianceGlossaryEntry[];
  complianceGlossaryLoading: boolean;
  searchComplianceGlossary: (query: string) => void;

  /** Compliance chat */
  complianceMessages: ComplianceChatMessage[];
  complianceChatLoading: boolean;
  sendComplianceMessage: (text: string) => Promise<void>;

  /** Compliance health (for sidebar badges + dashboard summary) */
  complianceHealth: ComplianceHealthStatus | null;
  complianceHealthLoading: boolean;
  refreshComplianceHealth: () => void;
};

const CopilotContext = React.createContext<CopilotState | null>(null);

/* ─── Session ID ───────────────────────────────────────────────────────── */

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("zc.copilot.sessionId");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("zc.copilot.sessionId", sid);
  }
  return sid;
}

/* ─── Compliance State Collector ───────────────────────────────────────── */

async function fetchComplianceState(branchId: string): Promise<ComplianceState> {
  const defaults: ComplianceState = {
    hasWorkspace: false, workspaceStatus: null,
    hasAbhaConfig: false, hfrCompleteness: 0, hprLinked: 0,
    pmjayActive: false, cghsActive: false, echsActive: false,
    unmappedPercent: 100, nabhProgress: 0,
    evidenceCount: 0, evidenceExpiring: 0,
    validatorScore: 0, hasBlockingGaps: true, blockingGapCount: 0,
    pendingApprovals: 0,
  };
  try {
    const dashboard = await apiFetch<{
      workspaces: number; pendingApprovals: number;
      expiringEvidence: number; auditCycles: number;
    }>(`/api/compliance/dashboard?branchId=${branchId}`, {
      showLoader: false, branch: "none", skipNotify: true,
    });
    defaults.hasWorkspace = (dashboard.workspaces ?? 0) > 0;
    defaults.pendingApprovals = dashboard.pendingApprovals ?? 0;
    defaults.evidenceExpiring = dashboard.expiringEvidence ?? 0;
  } catch { /* Dashboard might not be available */ }
  try {
    const wsData = await apiFetch<any[] | { items: any[] }>(
      `/api/compliance/workspaces?branchId=${branchId}`,
      { showLoader: false, branch: "none", skipNotify: true },
    );
    const items = Array.isArray(wsData) ? wsData : (wsData?.items ?? []);
    if (items.length > 0) {
      defaults.hasWorkspace = true;
      defaults.workspaceStatus = items[0]?.status ?? null;
    }
  } catch { /* ignore */ }
  return defaults;
}

/* ─── Provider ─────────────────────────────────────────────────────────── */

const HEALTH_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const { branchId, activeBranchId, isReady } = useBranchContext();

  // Page context (set by each page via usePageCopilot)
  const [pageContext, setPageContext] = React.useState<PageContext | null>(null);

  // Health status
  const [health, setHealth] = React.useState<BranchHealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = React.useState(false);

  // Chat
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = React.useState(false);

  // Widget state
  const [widgetOpen, setWidgetOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("chat");

  /* ── Compliance AI state ──────────────────────────────────────────────── */
  const [compliancePageId, setCompliancePageId] = React.useState<string | null>(null);
  const [compliancePageHelp, setCompliancePageHelp] = React.useState<CompliancePageHelp | null>(null);
  const [compliancePageHelpLoading, setCompliancePageHelpLoading] = React.useState(false);
  const [complianceWhatsNext, setComplianceWhatsNext] = React.useState<ComplianceWhatsNext | null>(null);
  const [complianceWhatsNextLoading, setComplianceWhatsNextLoading] = React.useState(false);
  const [complianceState, setComplianceState] = React.useState<ComplianceState | null>(null);
  const [complianceGlossary, setComplianceGlossary] = React.useState<ComplianceGlossaryEntry[]>([]);
  const [complianceGlossaryLoading, setComplianceGlossaryLoading] = React.useState(false);
  const [complianceMessages, setComplianceMessages] = React.useState<ComplianceChatMessage[]>([]);
  const [complianceChatLoading, setComplianceChatLoading] = React.useState(false);

  const [complianceHealth, setComplianceHealth] = React.useState<ComplianceHealthStatus | null>(null);
  const [complianceHealthLoading, setComplianceHealthLoading] = React.useState(false);

  const isCompliancePage = !!compliancePageId;

  // ── Infrastructure health ──────────────────────────────────────────────

  const fetchHealth = React.useCallback(async (bustCache = false) => {
    if (!branchId) return;
    setHealthLoading(true);
    try {
      const url = bustCache
        ? `/api/ai/health-check?branchId=${branchId}&bust=${Date.now()}`
        : `/api/ai/health-check?branchId=${branchId}`;
      const data = await apiFetch<BranchHealthStatus>(url, {
        showLoader: false,
        branch: "none",
      });
      setHealth(data);
      try {
        sessionStorage.setItem("zc.copilot.health", JSON.stringify(data));
        window.dispatchEvent(new Event("zc:health-update"));
      } catch { /* ignore */ }
    } catch {
      // silently fail — health is advisory
    } finally {
      setHealthLoading(false);
    }
  }, [branchId]);

  React.useEffect(() => {
    if (!isReady || !branchId) return;
    fetchHealth();
    const interval = setInterval(() => fetchHealth(), HEALTH_REFRESH_MS);
    return () => clearInterval(interval);
  }, [isReady, branchId, fetchHealth]);

  React.useEffect(() => {
    const handler = () => { setTimeout(() => fetchHealth(true), 1500); };
    window.addEventListener("zc:data-changed", handler);
    return () => window.removeEventListener("zc:data-changed", handler);
  }, [fetchHealth]);

  // Clear infra chat when branch changes
  React.useEffect(() => {
    setMessages([]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("zc.copilot.sessionId");
    }
  }, [branchId]);

  // Infrastructure chat
  const sendMessage = React.useCallback(
    async (text: string) => {
      if (!branchId || !text.trim()) return;
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "user",
        content: text.trim(), timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);
      try {
        const res = await apiFetch<ChatResponse>("/api/ai/chat", {
          method: "POST",
          body: {
            message: text.trim(), branchId,
            sessionId: getSessionId(),
            pageContext: pageContext ?? undefined,
          },
          showLoader: false, branch: "none", skipNotify: true,
        });
        if (res.sessionId && typeof window !== "undefined") {
          sessionStorage.setItem("zc.copilot.sessionId", res.sessionId);
        }
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(), role: "assistant",
          content: res.answer, source: res.source,
          followUp: res.followUp, timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(), role: "assistant",
          content: 'Sorry, I couldn\'t process that. Try a simpler question like "How many beds do we have?"',
          source: "keyword_match", timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally { setChatLoading(false); }
    },
    [branchId, pageContext]
  );

  // ── Compliance: fetch compliance state on branch change ────────────────

  const bid = activeBranchId ?? branchId;
  React.useEffect(() => {
    if (!bid) return;
    let cancelled = false;
    (async () => {
      const state = await fetchComplianceState(bid);
      if (!cancelled) setComplianceState(state);
    })();
    return () => { cancelled = true; };
  }, [bid]);

  // ── Compliance: fetch compliance health (sidebar badges + dashboard) ────

  const fetchComplianceHealth = React.useCallback(async () => {
    if (!complianceState || !bid) return;
    setComplianceHealthLoading(true);
    try {
      const res = await apiFetch<ComplianceHealthStatus>(
        "/api/ai/compliance/health-check",
        {
          method: "POST",
          body: { complianceState, branchId: bid },
          showLoader: false, branch: "none", skipNotify: true,
        },
      );
      setComplianceHealth(res);
      // Broadcast to sessionStorage for NavBadgeAI sidebar badges
      try {
        sessionStorage.setItem("zc.copilot.compliance-health", JSON.stringify(res));
        window.dispatchEvent(new Event("zc:health-update"));
      } catch { /* ignore */ }
    } catch {
      // silently fail
    } finally {
      setComplianceHealthLoading(false);
    }
  }, [complianceState, bid]);

  // Auto-fetch compliance health when state loads/changes
  React.useEffect(() => {
    if (complianceState) {
      fetchComplianceHealth();
    }
  }, [complianceState, fetchComplianceHealth]);

  // Also refresh compliance health on data-changed event
  React.useEffect(() => {
    const handler = () => { setTimeout(() => fetchComplianceHealth(), 1500); };
    window.addEventListener("zc:data-changed", handler);
    return () => window.removeEventListener("zc:data-changed", handler);
  }, [fetchComplianceHealth]);

  // ── Compliance: fetch page help when page changes ──────────────────────

  React.useEffect(() => {
    if (!compliancePageId) { setCompliancePageHelp(null); return; }
    let cancelled = false;
    setCompliancePageHelpLoading(true);
    (async () => {
      try {
        const res = await apiFetch<CompliancePageHelp>("/api/ai/compliance/page-help", {
          method: "POST", body: { pageId: compliancePageId },
          showLoader: false, branch: "none", skipNotify: true,
        });
        if (!cancelled) setCompliancePageHelp(res);
      } catch {
        if (!cancelled) setCompliancePageHelp(null);
      } finally {
        if (!cancelled) setCompliancePageHelpLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [compliancePageId]);

  // ── Compliance: fetch whats next ───────────────────────────────────────

  React.useEffect(() => {
    if (!complianceState) return;
    let cancelled = false;
    setComplianceWhatsNextLoading(true);
    (async () => {
      try {
        const res = await apiFetch<ComplianceWhatsNext>("/api/ai/compliance/whats-next", {
          method: "POST",
          body: { complianceState, currentPage: compliancePageId },
          showLoader: false, branch: "none", skipNotify: true,
        });
        if (!cancelled) setComplianceWhatsNext(res);
      } catch { /* ignore */ }
      finally { if (!cancelled) setComplianceWhatsNextLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [complianceState, compliancePageId]);

  // ── Compliance: fetch glossary ─────────────────────────────────────────

  const searchComplianceGlossary = React.useCallback(async (query: string) => {
    setComplianceGlossaryLoading(true);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await apiFetch<{ terms: ComplianceGlossaryEntry[]; total: number }>(
        `/api/ai/compliance/glossary${params}`,
        { showLoader: false, branch: "none", skipNotify: true },
      );
      setComplianceGlossary(res.terms ?? []);
    } catch { setComplianceGlossary([]); }
    finally { setComplianceGlossaryLoading(false); }
  }, []);

  // Load glossary once on first compliance page visit
  const glossaryLoaded = React.useRef(false);
  React.useEffect(() => {
    if (isCompliancePage && !glossaryLoaded.current) {
      glossaryLoaded.current = true;
      searchComplianceGlossary("");
    }
  }, [isCompliancePage, searchComplianceGlossary]);

  // ── Compliance: chat ───────────────────────────────────────────────────

  const sendComplianceMessage = React.useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ComplianceChatMessage = {
      id: crypto.randomUUID(), role: "user",
      content: text.trim(), timestamp: Date.now(),
    };
    setComplianceMessages((prev) => [...prev, userMsg]);
    setComplianceChatLoading(true);
    try {
      const res = await apiFetch<any>("/api/ai/compliance/chat", {
        method: "POST",
        body: {
          message: text.trim(),
          pageContext: compliancePageId ?? undefined,
          complianceState: complianceState ?? undefined,
        },
        showLoader: false, branch: "none", skipNotify: true,
      });
      const assistantMsg: ComplianceChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: res.answer ?? "Sorry, I couldn't process that.",
        source: res.source, relatedTerms: res.relatedTerms,
        suggestedActions: res.suggestedActions, followUp: res.followUp,
        timestamp: Date.now(),
      };
      setComplianceMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ComplianceChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: 'Sorry, I couldn\'t process that. Try asking "Where do I start?" or "What is NABH?"',
        source: "knowledge_base", timestamp: Date.now(),
      };
      setComplianceMessages((prev) => [...prev, errorMsg]);
    } finally { setComplianceChatLoading(false); }
  }, [compliancePageId, complianceState]);

  // Clear compliance chat on branch change
  React.useEffect(() => {
    setComplianceMessages([]);
  }, [bid]);

  // ── Auto-switch tabs when entering/leaving compliance ──────────────────

  const prevIsCompliance = React.useRef(isCompliancePage);
  React.useEffect(() => {
    if (isCompliancePage && !prevIsCompliance.current) {
      // Entering compliance — switch to help tab
      setActiveTab("help");
    } else if (!isCompliancePage && prevIsCompliance.current) {
      // Leaving compliance — switch back to chat
      setActiveTab("chat");
    }
    prevIsCompliance.current = isCompliancePage;
  }, [isCompliancePage]);

  // ── Build value ────────────────────────────────────────────────────────

  const value = React.useMemo<CopilotState>(
    () => ({
      pageContext, setPageContext,
      health, healthLoading, refreshHealth: fetchHealth,
      messages, chatLoading, sendMessage,
      widgetOpen, setWidgetOpen, activeTab, setActiveTab,
      // Compliance
      isCompliancePage,
      compliancePageId, setCompliancePageId,
      compliancePageHelp, compliancePageHelpLoading,
      complianceWhatsNext, complianceWhatsNextLoading,
      complianceState,
      complianceGlossary, complianceGlossaryLoading, searchComplianceGlossary,
      complianceMessages, complianceChatLoading, sendComplianceMessage,
      complianceHealth, complianceHealthLoading, refreshComplianceHealth: fetchComplianceHealth,
    }),
    [
      pageContext, health, healthLoading, fetchHealth,
      messages, chatLoading, sendMessage,
      widgetOpen, activeTab,
      isCompliancePage, compliancePageId,
      compliancePageHelp, compliancePageHelpLoading,
      complianceWhatsNext, complianceWhatsNextLoading,
      complianceState,
      complianceGlossary, complianceGlossaryLoading, searchComplianceGlossary,
      complianceMessages, complianceChatLoading, sendComplianceMessage,
      complianceHealth, complianceHealthLoading, fetchComplianceHealth,
    ]
  );

  return (
    <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
  );
}

/* ─── Hooks ────────────────────────────────────────────────────────────── */

export function useCopilot(): CopilotState {
  const ctx = React.useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot must be used within <CopilotProvider>");
  return ctx;
}

/**
 * Safe version of useCopilot — returns null when outside <CopilotProvider>.
 * Useful for hooks that may be called at the page-component top level,
 * before <AppShell> (which contains CopilotProvider) renders.
 */
export function useCopilotSafe(): CopilotState | null {
  return React.useContext(CopilotContext);
}
