/* ─── Compliance AI Help Types ──────────────────────────────────────────── */

export type ComplianceHelpTip = {
  id: string;
  level: "info" | "warning" | "critical" | "success";
  title: string;
  message: string;
  actionLabel?: string | null;
  actionHref?: string | null;
};

export type ComplianceGlossaryEntry = {
  term: string;
  shortDef: string;
  longDef: string;
  category: string; // "ABDM" | "NABH" | "Schemes" | "General"
  relatedTerms: string[];
};

export type ComplianceWorkflowStep = {
  id: string;
  order: number;
  label: string;
  description: string;
  href: string;
  status: "done" | "current" | "upcoming" | "blocked";
  blockedReason?: string | null;
};

export type ComplianceWhatsNext = {
  currentPage: string;
  overallProgress: number;
  steps: ComplianceWorkflowStep[];
  generatedAt: number;
};

export type ComplianceChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "knowledge_base" | "contextual" | "ollama";
  relatedTerms?: ComplianceGlossaryEntry[];
  suggestedActions?: ComplianceHelpTip[];
  followUp?: string[];
  timestamp: number;
};

export type CompliancePageHelp = {
  pageId: string;
  pageTitle: string;
  pageDescription: string;
  whatIsThis: string;
  howToUse: string[];
  tips: ComplianceHelpTip[];
  relatedGlossary: ComplianceGlossaryEntry[];
  commonQuestions: { q: string; a: string }[];
  generatedAt: number;
};

export type ComplianceState = {
  hasWorkspace: boolean;
  workspaceStatus: string | null;
  hasAbhaConfig: boolean;
  hfrCompleteness: number;
  hprLinked: number;
  pmjayActive: boolean;
  cghsActive: boolean;
  echsActive: boolean;
  unmappedPercent: number;
  nabhProgress: number;
  evidenceCount: number;
  evidenceExpiring: number;
  validatorScore: number;
  hasBlockingGaps: boolean;
  blockingGapCount: number;
  pendingApprovals: number;
};
