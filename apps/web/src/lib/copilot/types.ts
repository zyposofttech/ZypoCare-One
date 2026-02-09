/* ─── Copilot shared types ─────────────────────────────────────────────── */

export type PageContext = {
  module: string; // "room" | "resource" | "branch" | "unit" | ...
  action: string; // "create" | "edit" | "list" | "view"
  entityId?: string;
  formData?: Record<string, unknown>;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "ollama" | "keyword_match" | "heuristic";
  followUp?: string[];
  timestamp: number;
};

export type CopilotAction = {
  label: string;
  type: "navigate" | "apply";
  href?: string;
  payload?: Record<string, unknown>;
};

export type HealthIssue = {
  id: string;
  severity: "BLOCKER" | "WARNING";
  title: string;
  category: string;
  fixHint: string;
  area: string;
};

export type BranchHealthStatus = {
  branchId: string;
  branchName: string;
  overallHealth: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  consistencyScore: number;
  nabhScore: number;
  goLiveScore: number;
  goLiveGrade: string;
  namingScore: number;
  totalBlockers: number;
  totalWarnings: number;
  canGoLive: boolean;
  topIssues: HealthIssue[];
  summary: string;
};

export type ChatResponse = {
  answer: string;
  source: "ollama" | "keyword_match";
  sessionId: string;
  followUp: string[];
  data?: Record<string, unknown>;
  durationMs: number;
};

export type FieldWarning = {
  level: "critical" | "warning" | "info";
  message: string;
  field?: string;
  suggestedValue?: unknown;
};

export type FieldValidationResult = {
  valid: boolean;
  warnings: FieldWarning[];
  suggestion?: {
    value: Record<string, unknown>;
    reasoning: string;
    confidence: number;
  };
};

export type PageInsight = {
  id: string;
  level: "info" | "warning" | "critical";
  message: string;
  actionHint?: string | null;
  entityCount?: number | null;
};

export type PageInsightsResponse = {
  module: string;
  insights: PageInsight[];
  generatedAt: number;
};

/* ─── Data-change event ──────────────────────────────────────────────── */

/**
 * Call after any successful create / update / delete mutation so the
 * AI copilot refreshes health checks and page-level insights.
 *
 * Usage:  notifyDataChanged();
 */
export function notifyDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("zc:data-changed"));
  }
}
