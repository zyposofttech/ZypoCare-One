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

/* ─── Context shape ────────────────────────────────────────────────────── */

type CopilotState = {
  /** Current page context (module, action, formData) */
  pageContext: PageContext | null;
  setPageContext: (ctx: PageContext | null) => void;

  /** Branch health status (refreshed every 5 min) */
  health: BranchHealthStatus | null;
  healthLoading: boolean;
  refreshHealth: () => void;

  /** Chat */
  messages: ChatMessage[];
  chatLoading: boolean;
  sendMessage: (text: string) => Promise<void>;

  /** Widget visibility */
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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

/* ─── Provider ─────────────────────────────────────────────────────────── */

const HEALTH_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const { branchId, isReady } = useBranchContext();

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

  // Fetch health status
  const fetchHealth = React.useCallback(async () => {
    if (!branchId) return;
    setHealthLoading(true);
    try {
      const data = await apiFetch<BranchHealthStatus>(
        `/api/ai/health-check?branchId=${branchId}`,
        { showLoader: false, branch: "none" }
      );
      setHealth(data);
      // Broadcast to sidebar badges via sessionStorage + custom event
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

  // Initial fetch + interval
  React.useEffect(() => {
    if (!isReady || !branchId) return;

    fetchHealth();
    const interval = setInterval(fetchHealth, HEALTH_REFRESH_MS);
    return () => clearInterval(interval);
  }, [isReady, branchId, fetchHealth]);

  // Re-fetch health when infrastructure data changes (e.g. create/update/delete)
  React.useEffect(() => {
    const handler = () => {
      // Small debounce — wait 1.5s after mutation for DB to settle
      setTimeout(() => fetchHealth(), 1500);
    };
    window.addEventListener("zc:data-changed", handler);
    return () => window.removeEventListener("zc:data-changed", handler);
  }, [fetchHealth]);

  // Clear chat when branch changes
  React.useEffect(() => {
    setMessages([]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("zc.copilot.sessionId");
    }
  }, [branchId]);

  // Send chat message
  const sendMessage = React.useCallback(
    async (text: string) => {
      if (!branchId || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);

      try {
        const res = await apiFetch<ChatResponse>("/api/ai/chat", {
          method: "POST",
          body: {
            message: text.trim(),
            branchId,
            sessionId: getSessionId(),
            pageContext: pageContext ?? undefined,
          },
          showLoader: false,
          branch: "none",
        });

        // Update session ID from server
        if (res.sessionId && typeof window !== "undefined") {
          sessionStorage.setItem("zc.copilot.sessionId", res.sessionId);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          source: res.source,
          followUp: res.followUp,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I couldn't process that. Try a simpler question like \"How many beds do we have?\"",
          source: "keyword_match",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setChatLoading(false);
      }
    },
    [branchId, pageContext]
  );

  const value = React.useMemo<CopilotState>(
    () => ({
      pageContext,
      setPageContext,
      health,
      healthLoading,
      refreshHealth: fetchHealth,
      messages,
      chatLoading,
      sendMessage,
      widgetOpen,
      setWidgetOpen,
      activeTab,
      setActiveTab,
    }),
    [
      pageContext,
      health,
      healthLoading,
      fetchHealth,
      messages,
      chatLoading,
      sendMessage,
      widgetOpen,
      activeTab,
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
