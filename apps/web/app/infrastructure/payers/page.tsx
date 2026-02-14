"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";

import { AppShell } from "@/components/AppShell";
import { RequirePerm } from "@/components/RequirePerm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { useBranchContext } from "@/lib/branch/useBranchContext";
import { useActiveBranchStore } from "@/lib/branch/active-branch";
import { usePageInsights } from "@/lib/copilot/usePageInsights";
import { PageInsightBanner } from "@/components/copilot/PageInsightBanner";
import {
  AlertTriangle,
  Building2,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city: string };

type PayerKind =
  | "INSURANCE"
  | "TPA"
  | "CORPORATE"
  | "GOVERNMENT"
  | "TRUST"
  | "EMPLOYEE"
  | "SELF_PAY";

type PayerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";

type PayerContract = {
  id: string;
  name: string;
  status: string;
};

type PayerRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  shortName: string | null;
  displayName: string | null;
  kind: PayerKind;
  status: PayerStatus;
  creditDays: number | null;
  creditLimit: number | null;
  requiresPreauth: boolean;
  empanelmentStartDate: string | null;
  empanelmentEndDate: string | null;
  isActive: boolean;
  contracts: PayerContract[];

  // Regulatory fields (may be missing)
  irdaiRegistration?: string | null;
  licenseNumber?: string | null;
  licenseValidTill?: string | null;
  panNumber?: string | null;
  gstinNumber?: string | null;
  cinNumber?: string | null;

  // Financial extras
  gracePeriodDays?: number | null;
  interestRate?: number | null;
  earlyPaymentDiscount?: number | null;

  // Operational extras
  preauthThreshold?: number | null;
  networkType?: string | null;
  empanelmentLevel?: string | null;

  // Contact & Address
  addresses?: any | null;
  contacts?: any | null;
  portalUrl?: string | null;

  // Claims & Documents
  claimSubmissionMethod?: string[];
  supportingDocs?: string[];

  // Room limits
  roomRentLimit?: number | null;
  icuRentLimit?: number | null;

  // Auto-renewal
  autoRenewal?: boolean;

  // Integration
  apiEndpoint?: string | null;
  authMethod?: string | null;
  webhookUrl?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type PayerForm = {
  code: string;
  name: string;
  shortName: string;
  displayName: string;
  kind: PayerKind;
  // Regulatory
  irdaiRegistration: string;
  licenseNumber: string;
  licenseValidTill: string;
  panNumber: string;
  gstinNumber: string;
  cinNumber: string;
  // Contact
  portalUrl: string;
  // Addresses (structured)
  regAddrLine1: string;
  regAddrCity: string;
  regAddrState: string;
  regAddrPin: string;
  billAddrLine1: string;
  billAddrCity: string;
  billAddrState: string;
  billAddrPin: string;
  claimsAddrLine1: string;
  claimsAddrCity: string;
  claimsAddrState: string;
  claimsAddrPin: string;
  // Contacts (structured)
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  claimsContactName: string;
  claimsContactPhone: string;
  claimsContactEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  // Financial
  creditDays: string;
  creditLimit: string;
  gracePeriodDays: string;
  interestRate: string;
  earlyPaymentDiscount: string;
  roomRentLimit: string;
  icuRentLimit: string;
  // Operational
  requiresPreauth: boolean;
  preauthThreshold: string;
  networkType: string;
  empanelmentLevel: string;
  claimSubmissionMethod: string;
  supportingDocs: string;
  empanelmentStartDate: string;
  empanelmentEndDate: string;
  autoRenewal: boolean;
  // Integration
  apiEndpoint: string;
  authMethod: string;
  webhookUrl: string;
  // Documents (stored in meta JSON)
  docEmpanelmentUrl: string;
  docEmpanelmentExpiry: string;
  docAgreementUrl: string;
  docAgreementExpiry: string;
  docTariffUrl: string;
  docPanelCertUrl: string;
  docPanelCertExpiry: string;
  docCorrespondenceUrl: string;
  docCorrespondenceDate: string;
  docCorrespondenceNotes: string;
};

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const PAYER_KINDS: PayerKind[] = [
  "INSURANCE",
  "TPA",
  "CORPORATE",
  "GOVERNMENT",
  "TRUST",
  "EMPLOYEE",
  "SELF_PAY",
];

const KIND_LABELS: Record<PayerKind, string> = {
  INSURANCE: "Insurance",
  TPA: "TPA",
  CORPORATE: "Corporate",
  GOVERNMENT: "Government",
  TRUST: "Trust",
  EMPLOYEE: "Employee",
  SELF_PAY: "Self Pay",
};

const PAYER_STATUSES: PayerStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"];

const STATUS_LABELS: Record<PayerStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  BLOCKED: "Blocked",
};

const NETWORK_TYPES = ["PREFERRED", "NON_PREFERRED", "EMPANELLED", "NON_EMPANELLED"];

const EMPANELMENT_LEVELS = ["NATIONAL", "STATE", "CITY", "BRANCH"];

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function buildQS(params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s || s === "all") return;
    usp.set(k, s);
  });
  return usp.toString();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zc-panel/30", className)} />;
}

function emptyForm(): PayerForm {
  return {
    code: "",
    name: "",
    shortName: "",
    displayName: "",
    kind: "INSURANCE",
    irdaiRegistration: "",
    licenseNumber: "",
    licenseValidTill: "",
    panNumber: "",
    gstinNumber: "",
    cinNumber: "",
    portalUrl: "",
    regAddrLine1: "", regAddrCity: "", regAddrState: "", regAddrPin: "",
    billAddrLine1: "", billAddrCity: "", billAddrState: "", billAddrPin: "",
    claimsAddrLine1: "", claimsAddrCity: "", claimsAddrState: "", claimsAddrPin: "",
    primaryContactName: "", primaryContactPhone: "", primaryContactEmail: "",
    claimsContactName: "", claimsContactPhone: "", claimsContactEmail: "",
    emergencyContactName: "", emergencyContactPhone: "",
    creditDays: "",
    creditLimit: "",
    gracePeriodDays: "",
    interestRate: "",
    earlyPaymentDiscount: "",
    roomRentLimit: "",
    icuRentLimit: "",
    requiresPreauth: false,
    preauthThreshold: "",
    networkType: "",
    empanelmentLevel: "",
    claimSubmissionMethod: "",
    supportingDocs: "",
    empanelmentStartDate: "",
    empanelmentEndDate: "",
    autoRenewal: false,
    apiEndpoint: "",
    authMethod: "",
    webhookUrl: "",
    docEmpanelmentUrl: "",
    docEmpanelmentExpiry: "",
    docAgreementUrl: "",
    docAgreementExpiry: "",
    docTariffUrl: "",
    docPanelCertUrl: "",
    docPanelCertExpiry: "",
    docCorrespondenceUrl: "",
    docCorrespondenceDate: "",
    docCorrespondenceNotes: "",
  };
}

function kindBadge(kind: PayerKind) {
  switch (kind) {
    case "INSURANCE":
      return <Badge variant="info">{KIND_LABELS[kind]}</Badge>;
    case "TPA":
      return <Badge variant="accent">{KIND_LABELS[kind]}</Badge>;
    case "CORPORATE":
      return <Badge variant="neutral">{KIND_LABELS[kind]}</Badge>;
    case "GOVERNMENT":
      return <Badge variant="success">{KIND_LABELS[kind]}</Badge>;
    case "TRUST":
      return <Badge variant="warning">{KIND_LABELS[kind]}</Badge>;
    case "EMPLOYEE":
      return <Badge variant="secondary">{KIND_LABELS[kind]}</Badge>;
    case "SELF_PAY":
      return <Badge variant="outline">{KIND_LABELS[kind]}</Badge>;
    default:
      return <Badge variant="secondary">{kind}</Badge>;
  }
}

function statusBadge(status: PayerStatus) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="ok">ACTIVE</Badge>;
    case "INACTIVE":
      return <Badge variant="secondary">INACTIVE</Badge>;
    case "SUSPENDED":
      return <Badge variant="warning">SUSPENDED</Badge>;
    case "BLOCKED":
      return <Badge variant="destructive">BLOCKED</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function drawerClassName(extra?: string) {
  return cn(
    "left-auto right-0 top-0 h-screen w-[95vw] max-w-[980px] translate-x-0 translate-y-0",
    "rounded-2xl",
    "border border-indigo-200/50 dark:border-indigo-800/50 bg-zc-card",
    "shadow-2xl shadow-indigo-500/10",
    "overflow-y-auto",
    extra,
  );
}

async function apiTry<T>(primary: string, fallback: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(primary, init as any);
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      return await apiFetch<T>(fallback, init as any);
    }
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function PayerManagementPage() {
  const { toast } = useToast();
  const branchCtx = useBranchContext();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useActiveBranchStore((s) => s.setActiveBranchId);

  const isGlobalScope = branchCtx.scope === "GLOBAL";
  const effectiveBranchId = branchCtx.branchId ?? activeBranchId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string>("");

  const [rows, setRows] = React.useState<PayerRow[]>([]);

  // AI Copilot
  const { insights, loading: insightsLoading, dismiss: dismissInsight } = usePageInsights({
    module: "payers",
    enabled: !!branchId,
  });

  // Filters
  const [q, setQ] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [includeInactive, setIncludeInactive] = React.useState(false);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<PayerForm>(emptyForm());
  const [formTab, setFormTab] = React.useState<"basic" | "regulatory" | "contact" | "financial" | "operational" | "integration" | "documents">("basic");
  const [saving, setSaving] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);

  const mustSelectBranch = !branchId;

  /* ---- Branch loading ---- */

  async function loadBranches(): Promise<string | null> {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = effectiveBranchId || null;
    const first = list[0]?.id || null;
    const next = (stored && list.some((b) => b.id === stored) ? stored : null) || first;

    if (next) if (isGlobalScope) setActiveBranchId(next || null);
    setBranchId(next || "");
    return next;
  }

  /* ---- Payers loading ---- */

  async function loadPayers(showToast = false, targetBranchId?: string) {
    const target = targetBranchId || branchId;
    if (!target) return;
    setErr(null);
    setLoading(true);
    try {
      const qs = buildQS({
        branchId: target,
        q: q.trim() || undefined,
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
        includeInactive: includeInactive ? "true" : undefined,
      });

      const res = await apiTry<any>(
        `/api/infrastructure/payers?${qs}`,
        `/api/infra/payers?${qs}`,
      );

      const list: PayerRow[] = Array.isArray(res) ? res : res?.rows || [];
      setRows(list);

      if (showToast) {
        toast({ title: "Payers refreshed", description: "Loaded latest payers for this branch." });
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load payers";
      setErr(msg);
      setRows([]);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(showToast = false) {
    setLoading(true);
    setErr(null);
    try {
      const bid = branchId || (await loadBranches());
      if (!bid) {
        setLoading(false);
        return;
      }
      await loadPayers(false, bid);
      if (showToast) toast({ title: "Ready", description: "Branch scope and payers are up to date." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    void loadPayers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, kindFilter, statusFilter, includeInactive]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadPayers(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onBranchChange(nextId: string) {
    setBranchId(nextId);
    if (isGlobalScope) setActiveBranchId(nextId || null);
    setQ("");
    setKindFilter("");
    setStatusFilter("");
    setIncludeInactive(false);
    setErr(null);
    void loadPayers(false, nextId);
  }

  /* ---- Stats ---- */

  const stats = React.useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive).length;
    const insurance = rows.filter((r) => r.kind === "INSURANCE").length;
    const tpa = rows.filter((r) => r.kind === "TPA").length;
    const corporate = rows.filter((r) => r.kind === "CORPORATE").length;
    const government = rows.filter((r) => r.kind === "GOVERNMENT").length;
    return { total, active, insurance, tpa, corporate, government };
  }, [rows]);

  /* ---- Dialog helpers ---- */

  function openCreate() {
    setDialogMode("create");
    setEditId(null);
    setForm(emptyForm());
    setFormTab("basic");
    setFormErr(null);
    setDialogOpen(true);
  }

  function openEdit(row: PayerRow) {
    setDialogMode("edit");
    setEditId(row.id);
    setForm({
      code: row.code || "",
      name: row.name || "",
      shortName: row.shortName || "",
      displayName: row.displayName || "",
      kind: row.kind,
      irdaiRegistration: row.irdaiRegistration || "",
      licenseNumber: row.licenseNumber || "",
      licenseValidTill: row.licenseValidTill || "",
      panNumber: row.panNumber || "",
      gstinNumber: row.gstinNumber || "",
      cinNumber: row.cinNumber || "",
      portalUrl: row.portalUrl || "",
      regAddrLine1: row.addresses?.registered?.line1 || "",
      regAddrCity: row.addresses?.registered?.city || "",
      regAddrState: row.addresses?.registered?.state || "",
      regAddrPin: row.addresses?.registered?.pin || "",
      billAddrLine1: row.addresses?.billing?.line1 || "",
      billAddrCity: row.addresses?.billing?.city || "",
      billAddrState: row.addresses?.billing?.state || "",
      billAddrPin: row.addresses?.billing?.pin || "",
      claimsAddrLine1: row.addresses?.claims?.line1 || "",
      claimsAddrCity: row.addresses?.claims?.city || "",
      claimsAddrState: row.addresses?.claims?.state || "",
      claimsAddrPin: row.addresses?.claims?.pin || "",
      primaryContactName: row.contacts?.primary?.name || "",
      primaryContactPhone: row.contacts?.primary?.phone || "",
      primaryContactEmail: row.contacts?.primary?.email || "",
      claimsContactName: row.contacts?.claims?.name || "",
      claimsContactPhone: row.contacts?.claims?.phone || "",
      claimsContactEmail: row.contacts?.claims?.email || "",
      emergencyContactName: row.contacts?.emergency?.name || "",
      emergencyContactPhone: row.contacts?.emergency?.phone || "",
      creditDays: row.creditDays != null ? String(row.creditDays) : "",
      creditLimit: row.creditLimit != null ? String(row.creditLimit) : "",
      gracePeriodDays: row.gracePeriodDays != null ? String(row.gracePeriodDays) : "",
      interestRate: row.interestRate != null ? String(row.interestRate) : "",
      earlyPaymentDiscount: row.earlyPaymentDiscount != null ? String(row.earlyPaymentDiscount) : "",
      roomRentLimit: row.roomRentLimit != null ? String(row.roomRentLimit) : "",
      icuRentLimit: row.icuRentLimit != null ? String(row.icuRentLimit) : "",
      requiresPreauth: row.requiresPreauth ?? false,
      preauthThreshold: row.preauthThreshold != null ? String(row.preauthThreshold) : "",
      networkType: row.networkType || "",
      empanelmentLevel: row.empanelmentLevel || "",
      claimSubmissionMethod: (row.claimSubmissionMethod || []).join(", "),
      supportingDocs: (row.supportingDocs || []).join(", "),
      empanelmentStartDate: row.empanelmentStartDate ? row.empanelmentStartDate.slice(0, 10) : "",
      empanelmentEndDate: row.empanelmentEndDate ? row.empanelmentEndDate.slice(0, 10) : "",
      autoRenewal: row.autoRenewal ?? false,
      apiEndpoint: row.apiEndpoint || "",
      authMethod: row.authMethod || "",
      webhookUrl: row.webhookUrl || "",
      // Documents from meta
      docEmpanelmentUrl: (row as any).meta?.empanelmentLetterUrl || "",
      docEmpanelmentExpiry: (row as any).meta?.empanelmentLetterExpiry || "",
      docAgreementUrl: (row as any).meta?.agreementUrl || "",
      docAgreementExpiry: (row as any).meta?.agreementExpiry || "",
      docTariffUrl: (row as any).meta?.tariffScheduleUrl || "",
      docPanelCertUrl: (row as any).meta?.panelCertificateUrl || "",
      docPanelCertExpiry: (row as any).meta?.panelCertificateExpiry || "",
      docCorrespondenceUrl: (row as any).meta?.correspondenceUrl || "",
      docCorrespondenceDate: (row as any).meta?.correspondenceDate || "",
      docCorrespondenceNotes: (row as any).meta?.correspondenceNotes || "",
    });
    setFormTab("basic");
    setFormErr(null);
    setDialogOpen(true);
  }

  function set<K extends keyof PayerForm>(key: K, value: PayerForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit() {
    setFormErr(null);
    if (!form.code.trim()) return setFormErr("Payer code is required");
    if (!form.name.trim()) return setFormErr("Payer name is required");

    // Build structured addresses
    const regAddr = { line1: form.regAddrLine1.trim(), city: form.regAddrCity.trim(), state: form.regAddrState.trim(), pin: form.regAddrPin.trim() };
    const billAddr = { line1: form.billAddrLine1.trim(), city: form.billAddrCity.trim(), state: form.billAddrState.trim(), pin: form.billAddrPin.trim() };
    const claimsAddr = { line1: form.claimsAddrLine1.trim(), city: form.claimsAddrCity.trim(), state: form.claimsAddrState.trim(), pin: form.claimsAddrPin.trim() };
    const hasRegAddr = Object.values(regAddr).some(Boolean);
    const hasBillAddr = Object.values(billAddr).some(Boolean);
    const hasClaimsAddr = Object.values(claimsAddr).some(Boolean);
    const addresses = (hasRegAddr || hasBillAddr || hasClaimsAddr)
      ? { ...(hasRegAddr ? { registered: regAddr } : {}), ...(hasBillAddr ? { billing: billAddr } : {}), ...(hasClaimsAddr ? { claims: claimsAddr } : {}) }
      : null;

    // Build structured contacts
    const primaryC = { name: form.primaryContactName.trim(), phone: form.primaryContactPhone.trim(), email: form.primaryContactEmail.trim() };
    const claimsC = { name: form.claimsContactName.trim(), phone: form.claimsContactPhone.trim(), email: form.claimsContactEmail.trim() };
    const emergC = { name: form.emergencyContactName.trim(), phone: form.emergencyContactPhone.trim() };
    const hasPrimary = Object.values(primaryC).some(Boolean);
    const hasClaims = Object.values(claimsC).some(Boolean);
    const hasEmerg = Object.values(emergC).some(Boolean);
    const contacts = (hasPrimary || hasClaims || hasEmerg)
      ? { ...(hasPrimary ? { primary: primaryC } : {}), ...(hasClaims ? { claims: claimsC } : {}), ...(hasEmerg ? { emergency: emergC } : {}) }
      : null;

    const claimSubmissionMethod = form.claimSubmissionMethod.split(",").map(s => s.trim()).filter(Boolean);
    const supportingDocs = form.supportingDocs.split(",").map(s => s.trim()).filter(Boolean);

    const body: Record<string, any> = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      displayName: form.displayName.trim() || null,
      kind: form.kind,
      branchId,
      // Regulatory
      irdaiRegistration: form.irdaiRegistration.trim() || null,
      licenseNumber: form.licenseNumber.trim() || null,
      licenseValidTill: form.licenseValidTill.trim() || null,
      panNumber: form.panNumber.trim() || null,
      gstinNumber: form.gstinNumber.trim() || null,
      cinNumber: form.cinNumber.trim() || null,
      // Contact
      addresses,
      contacts,
      portalUrl: form.portalUrl.trim() || null,
      // Financial
      creditDays: form.creditDays ? Number(form.creditDays) : null,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
      gracePeriodDays: form.gracePeriodDays ? Number(form.gracePeriodDays) : null,
      interestRate: form.interestRate ? Number(form.interestRate) : null,
      earlyPaymentDiscount: form.earlyPaymentDiscount ? Number(form.earlyPaymentDiscount) : null,
      roomRentLimit: form.roomRentLimit ? Number(form.roomRentLimit) : null,
      icuRentLimit: form.icuRentLimit ? Number(form.icuRentLimit) : null,
      // Operational
      requiresPreauth: form.requiresPreauth,
      preauthThreshold: form.preauthThreshold ? Number(form.preauthThreshold) : null,
      networkType: form.networkType || null,
      empanelmentLevel: form.empanelmentLevel || null,
      claimSubmissionMethod,
      supportingDocs,
      empanelmentStartDate: form.empanelmentStartDate ? new Date(form.empanelmentStartDate).toISOString() : null,
      empanelmentEndDate: form.empanelmentEndDate ? new Date(form.empanelmentEndDate).toISOString() : null,
      autoRenewal: form.autoRenewal,
      // Integration
      apiEndpoint: form.apiEndpoint.trim() || null,
      authMethod: form.authMethod || null,
      webhookUrl: form.webhookUrl.trim() || null,
      // Documents (stored in meta JSON field)
      meta: (() => {
        const docs: Record<string, any> = {};
        if ((form as any).docEmpanelmentUrl) docs.empanelmentLetterUrl = (form as any).docEmpanelmentUrl.trim();
        if ((form as any).docEmpanelmentExpiry) docs.empanelmentLetterExpiry = (form as any).docEmpanelmentExpiry;
        if ((form as any).docAgreementUrl) docs.agreementUrl = (form as any).docAgreementUrl.trim();
        if ((form as any).docAgreementExpiry) docs.agreementExpiry = (form as any).docAgreementExpiry;
        if ((form as any).docTariffUrl) docs.tariffScheduleUrl = (form as any).docTariffUrl.trim();
        if ((form as any).docPanelCertUrl) docs.panelCertificateUrl = (form as any).docPanelCertUrl.trim();
        if ((form as any).docPanelCertExpiry) docs.panelCertificateExpiry = (form as any).docPanelCertExpiry;
        if ((form as any).docCorrespondenceUrl) docs.correspondenceUrl = (form as any).docCorrespondenceUrl.trim();
        if ((form as any).docCorrespondenceDate) docs.correspondenceDate = (form as any).docCorrespondenceDate;
        if ((form as any).docCorrespondenceNotes) docs.correspondenceNotes = (form as any).docCorrespondenceNotes.trim();
        return Object.keys(docs).length > 0 ? docs : null;
      })(),
    };

    setSaving(true);
    try {
      if (dialogMode === "edit" && editId) {
        await apiTry<any>(
          `/api/infrastructure/payers/${editId}`,
          `/api/infra/payers/${editId}`,
          { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } },
        );
        toast({ title: "Payer Updated", description: `Successfully updated "${form.name}"`, variant: "success" as any });
      } else {
        await apiTry<any>(
          `/api/infrastructure/payers`,
          `/api/infra/payers`,
          { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } },
        );
        toast({ title: "Payer Created", description: `Successfully created "${form.name}"`, variant: "success" as any });
      }

      setDialogOpen(false);
      setForm(emptyForm());
      void loadPayers(false);
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setFormErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" as any });
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(row: PayerRow) {
    if (!confirm(`Deactivate payer "${row.name}"? This is a soft delete.`)) return;
    setBusy(true);
    try {
      await apiTry<any>(
        `/api/infrastructure/payers/${row.id}`,
        `/api/infra/payers/${row.id}`,
        { method: "DELETE" },
      );
      toast({ title: "Payer deactivated", description: `"${row.name}" has been deactivated.` });
      void loadPayers(false);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Could not deactivate payer", variant: "destructive" as any });
    } finally {
      setBusy(false);
    }
  }

  /* ---- Render ---- */

  return (
    <AppShell title="Infrastructure - Payer Management">
      <RequirePerm perm="INFRA_PAYER_READ">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Building2 className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Payer Management</div>
              <div className="mt-1 text-sm text-zc-muted">
                Manage insurance companies, TPAs, corporates, and government payers for billing and claims.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => refreshAll(true)} disabled={loading || busy}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>

            <Button variant="primary" className="px-5 gap-2" onClick={openCreate} disabled={mustSelectBranch}>
              <Plus className="h-4 w-4" />
              New Payer
            </Button>
          </div>
        </div>

        {err ? (
          <Card className="border-zc-danger/40">
            <CardHeader className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-zc-danger" />
                <div>
                  <CardTitle className="text-base">Could not load payers</CardTitle>
                  <CardDescription className="mt-1">{err}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {/* Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Pick a branch, search payers, and review payer distribution by kind.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId || ""} onValueChange={onBranchChange}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.filter((b) => b.id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} - {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Insights */}
            <PageInsightBanner insights={insights} loading={insightsLoading} onDismiss={dismissInsight} />

            {/* Stats cards */}
            <div className="grid gap-3 md:grid-cols-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">Insurance</div>
                <div className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">{stats.insurance}</div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
                <div className="text-xs font-medium text-violet-600 dark:text-violet-400">TPA</div>
                <div className="mt-1 text-lg font-bold text-violet-700 dark:text-violet-300">{stats.tpa}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Corporate</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{stats.corporate}</div>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900/50 dark:bg-teal-900/10">
                <div className="text-xs font-medium text-teal-600 dark:text-teal-400">Government</div>
                <div className="mt-1 text-lg font-bold text-teal-700 dark:text-teal-300">{stats.government}</div>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zc-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code or name..."
                  className="pl-10"
                  disabled={mustSelectBranch}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={kindFilter || "all"} onValueChange={(v) => setKindFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40" disabled={mustSelectBranch}>
                    <SelectValue placeholder="All Kinds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Kinds</SelectItem>
                    {PAYER_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40" disabled={mustSelectBranch}>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PAYER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-3 rounded-xl border border-zc-border bg-zc-panel/20 px-3 py-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} disabled={mustSelectBranch} />
                  <div className="text-sm">
                    <div className="font-semibold text-zc-text">Include inactive</div>
                    <div className="text-xs text-zc-muted">Show deactivated payers</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Branch scoped</Badge>
              <Badge variant="ok">Linked to billing claims</Badge>
              <Badge variant="warning">Expired empanelment needs renewal</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payers table */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Payer Registry</CardTitle>
                <CardDescription>Insurance, TPA, corporate, and government payers.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Kind</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[130px]">Credit</TableHead>
                    <TableHead className="w-[100px]">Contracts</TableHead>
                    <TableHead className="w-[140px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zc-muted">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            No payers found.
                          </div>
                          <Button size="sm" onClick={openCreate} disabled={mustSelectBranch}>
                            New Payer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          <span className="font-semibold text-zc-text">{r.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-zc-text">{r.name}</span>
                            {r.shortName ? (
                              <span className="text-xs text-zc-muted">{r.shortName}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{kindBadge(r.kind)}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="text-zc-text">
                              {r.creditDays != null ? `${r.creditDays} days` : "\u2014"}
                            </span>
                            {r.creditLimit != null ? (
                              <span className="text-zc-muted">
                                Limit: {Number(r.creditLimit).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-zc-text">
                            {r.contracts?.length ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(r)}>
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-zc-danger hover:text-zc-danger"
                              onClick={() => void onDeactivate(r)}
                              disabled={busy || !r.isActive}
                              title={!r.isActive ? "Already inactive" : "Deactivate payer"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-zc-border p-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-zc-muted">
                  Total: <span className="font-semibold text-zc-text">{rows.length}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {stats.insurance} Insurance
                  </Badge>
                  <Badge variant="secondary">
                    {stats.tpa} TPA
                  </Badge>
                  <Badge variant="secondary">
                    {stats.corporate} Corporate
                  </Badge>
                  <Badge variant="secondary">
                    {stats.government} Government
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom guidance callout */}
        <div className="rounded-2xl border border-zc-border bg-zc-panel/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zc-text">Payer setup guide</div>
              <div className="mt-1 text-sm text-zc-muted">
                1) Register payers with valid IRDAI / license details, then 2) configure credit terms and pre-auth rules, then 3) create contracts and map tariff plans for cashless billing.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Payer Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setFormErr(null);
            setDialogOpen(false);
          }
        }}
      >
        <DialogContent className={drawerClassName()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {dialogMode === "edit" ? "Edit Payer" : "Add Payer"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update payer details, regulatory info, financial terms, and operational configuration."
                : "Register a new payer with basic info, regulatory compliance, financial terms, and operational settings."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          {formErr ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-[rgb(var(--zc-danger-rgb)/0.35)] bg-[rgb(var(--zc-danger-rgb)/0.12)] px-3 py-2 text-sm text-[rgb(var(--zc-danger))]">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="min-w-0">{formErr}</div>
            </div>
          ) : null}

          {/* Tabs for form sections */}
          <Tabs value={formTab} onValueChange={(v) => setFormTab(v as any)}>
            <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1 mb-4 flex-wrap")}>
              {(["basic", "regulatory", "contact", "financial", "operational", "integration", "documents"] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                  )}
                >
                  {{
                    basic: "Basic Info",
                    regulatory: "Regulatory",
                    contact: "Contact",
                    financial: "Financial",
                    operational: "Operational",
                    integration: "Integration",
                    documents: "Documents",
                  }[tab]}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab: Basic Info */}
            <TabsContent value="basic" className="mt-0">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Payer Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    placeholder="e.g., PAY-INS-001"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-zc-muted">Unique identifier for this payer.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Payer Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g., Star Health and Allied Insurance Co. Ltd."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Short Name</Label>
                    <Input
                      value={form.shortName}
                      onChange={(e) => set("shortName", e.target.value)}
                      placeholder="e.g., Star Health"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Display Name</Label>
                    <Input
                      value={form.displayName}
                      onChange={(e) => set("displayName", e.target.value)}
                      placeholder="e.g., Star Health Insurance"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Kind *</Label>
                  <Select value={form.kind} onValueChange={(v) => set("kind", v as PayerKind)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select kind" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYER_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Regulatory */}
            <TabsContent value="regulatory" className="mt-0">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>IRDAI Registration</Label>
                    <Input
                      value={form.irdaiRegistration}
                      onChange={(e) => set("irdaiRegistration", e.target.value)}
                      placeholder="IRDAI registration number"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>License Number</Label>
                    <Input
                      value={form.licenseNumber}
                      onChange={(e) => set("licenseNumber", e.target.value)}
                      placeholder="License number"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>License Valid Till</Label>
                  <Input
                    type="date"
                    value={form.licenseValidTill}
                    onChange={(e) => set("licenseValidTill", e.target.value)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>PAN Number</Label>
                    <Input
                      value={form.panNumber}
                      onChange={(e) => set("panNumber", e.target.value.toUpperCase())}
                      placeholder="e.g., AAACL1234F"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>GSTIN Number</Label>
                    <Input
                      value={form.gstinNumber}
                      onChange={(e) => set("gstinNumber", e.target.value.toUpperCase())}
                      placeholder="15-digit GST number"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>CIN Number</Label>
                    <Input
                      value={form.cinNumber}
                      onChange={(e) => set("cinNumber", e.target.value.toUpperCase())}
                      placeholder="Corporate Identity Number"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Contact */}
            <TabsContent value="contact" className="mt-0">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Portal URL</Label>
                  <Input
                    value={form.portalUrl}
                    onChange={(e) => set("portalUrl", e.target.value)}
                    placeholder="https://portal.example.com"
                  />
                  <p className="text-[11px] text-zc-muted">Payer online portal for claims submission.</p>
                </div>

                <Separator />

                {/* Registered Address */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Registered Address</div>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Address Line</Label>
                      <Input value={form.regAddrLine1} onChange={(e) => set("regAddrLine1", e.target.value)} placeholder="Street address, building, floor" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">City</Label>
                        <Input value={form.regAddrCity} onChange={(e) => set("regAddrCity", e.target.value)} placeholder="City" />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">State</Label>
                        <Input value={form.regAddrState} onChange={(e) => set("regAddrState", e.target.value)} placeholder="State" />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">PIN Code</Label>
                        <Input value={form.regAddrPin} onChange={(e) => set("regAddrPin", e.target.value)} placeholder="560001" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Billing Address</div>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Address Line</Label>
                      <Input value={form.billAddrLine1} onChange={(e) => set("billAddrLine1", e.target.value)} placeholder="Street address, building, floor" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">City</Label>
                        <Input value={form.billAddrCity} onChange={(e) => set("billAddrCity", e.target.value)} placeholder="City" />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">State</Label>
                        <Input value={form.billAddrState} onChange={(e) => set("billAddrState", e.target.value)} placeholder="State" />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">PIN Code</Label>
                        <Input value={form.billAddrPin} onChange={(e) => set("billAddrPin", e.target.value)} placeholder="560001" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claims Address */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Claims Address</div>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Address Line</Label>
                      <Input value={form.claimsAddrLine1} onChange={(e) => set("claimsAddrLine1", e.target.value)} placeholder="Street address, building, floor" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">City</Label>
                        <Input value={form.claimsAddrCity} onChange={(e) => set("claimsAddrCity", e.target.value)} placeholder="City" />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">State</Label>
                        <Input value={form.claimsAddrState} onChange={(e) => set("claimsAddrState", e.target.value)} placeholder="State" />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">PIN Code</Label>
                        <Input value={form.claimsAddrPin} onChange={(e) => set("claimsAddrPin", e.target.value)} placeholder="560001" />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Primary Contact */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Primary Contact</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={form.primaryContactName} onChange={(e) => set("primaryContactName", e.target.value)} placeholder="Contact person name" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={form.primaryContactPhone} onChange={(e) => set("primaryContactPhone", e.target.value)} placeholder="9876543210" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={form.primaryContactEmail} onChange={(e) => set("primaryContactEmail", e.target.value)} placeholder="email@payer.com" />
                    </div>
                  </div>
                </div>

                {/* Claims Contact */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Claims Contact</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={form.claimsContactName} onChange={(e) => set("claimsContactName", e.target.value)} placeholder="Claims dept contact" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={form.claimsContactPhone} onChange={(e) => set("claimsContactPhone", e.target.value)} placeholder="9876543210" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={form.claimsContactEmail} onChange={(e) => set("claimsContactEmail", e.target.value)} placeholder="claims@payer.com" />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Emergency Contact</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} placeholder="Emergency contact person" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} placeholder="9876543210" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Financial Terms */}
            <TabsContent value="financial" className="mt-0">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Credit Days</Label>
                    <Input
                      type="number"
                      value={form.creditDays}
                      onChange={(e) => set("creditDays", e.target.value)}
                      placeholder="e.g., 30"
                    />
                    <p className="text-[11px] text-zc-muted">Number of days before payment is due.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Credit Limit (INR)</Label>
                    <Input
                      type="number"
                      value={form.creditLimit}
                      onChange={(e) => set("creditLimit", e.target.value)}
                      placeholder="e.g., 500000"
                    />
                    <p className="text-[11px] text-zc-muted">Maximum outstanding amount allowed.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Grace Period (days)</Label>
                    <Input
                      type="number"
                      value={form.gracePeriodDays}
                      onChange={(e) => set("gracePeriodDays", e.target.value)}
                      placeholder="e.g., 7"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.interestRate}
                      onChange={(e) => set("interestRate", e.target.value)}
                      placeholder="e.g., 1.5"
                    />
                    <p className="text-[11px] text-zc-muted">Applied after grace period expires.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Early Payment Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.earlyPaymentDiscount}
                      onChange={(e) => set("earlyPaymentDiscount", e.target.value)}
                      placeholder="e.g., 2.0"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Room Rent Limit (INR)</Label>
                    <Input
                      type="number"
                      value={form.roomRentLimit}
                      onChange={(e) => set("roomRentLimit", e.target.value)}
                      placeholder="e.g., 5000"
                    />
                    <p className="text-[11px] text-zc-muted">Maximum room rent per day.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>ICU Rent Limit (INR)</Label>
                    <Input
                      type="number"
                      value={form.icuRentLimit}
                      onChange={(e) => set("icuRentLimit", e.target.value)}
                      placeholder="e.g., 15000"
                    />
                    <p className="text-[11px] text-zc-muted">Maximum ICU rent per day.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Operational Config */}
            <TabsContent value="operational" className="mt-0">
              <div className="grid gap-4">
                <div className="flex items-center gap-4 rounded-xl border border-zc-border bg-zc-panel/20 px-4 py-3">
                  <Switch
                    checked={form.requiresPreauth}
                    onCheckedChange={(v) => set("requiresPreauth", v)}
                  />
                  <div>
                    <div className="text-sm font-semibold text-zc-text">Requires Pre-authorization</div>
                    <div className="text-xs text-zc-muted">
                      If enabled, claims above the threshold will require pre-auth approval.
                    </div>
                  </div>
                </div>

                {form.requiresPreauth ? (
                  <div className="grid gap-2">
                    <Label>Pre-auth Threshold (INR)</Label>
                    <Input
                      type="number"
                      value={form.preauthThreshold}
                      onChange={(e) => set("preauthThreshold", e.target.value)}
                      placeholder="e.g., 10000"
                    />
                    <p className="text-[11px] text-zc-muted">
                      Claims above this amount require pre-authorization.
                    </p>
                  </div>
                ) : null}

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Network Type</Label>
                    <Select value={form.networkType || "none"} onValueChange={(v) => set("networkType", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select network type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Set</SelectItem>
                        {NETWORK_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Empanelment Level</Label>
                    <Select value={form.empanelmentLevel || "none"} onValueChange={(v) => set("empanelmentLevel", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Set</SelectItem>
                        {EMPANELMENT_LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l.charAt(0) + l.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Claim Submission Method</Label>
                    <Input
                      value={form.claimSubmissionMethod}
                      onChange={(e) => set("claimSubmissionMethod", e.target.value)}
                      placeholder="e.g., PORTAL, EMAIL, PHYSICAL, API"
                    />
                    <p className="text-[11px] text-zc-muted">Comma-separated: PORTAL, EMAIL, PHYSICAL, API</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Supporting Documents</Label>
                    <Input
                      value={form.supportingDocs}
                      onChange={(e) => set("supportingDocs", e.target.value)}
                      placeholder="e.g., ID_PROOF, DISCHARGE_SUMMARY"
                    />
                    <p className="text-[11px] text-zc-muted">Comma-separated list of required documents.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Empanelment Start Date</Label>
                    <Input
                      type="date"
                      value={form.empanelmentStartDate}
                      onChange={(e) => set("empanelmentStartDate", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Empanelment End Date</Label>
                    <Input
                      type="date"
                      value={form.empanelmentEndDate}
                      onChange={(e) => set("empanelmentEndDate", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-zc-border bg-zc-panel/20 px-4 py-3">
                  <Switch
                    checked={form.autoRenewal}
                    onCheckedChange={(v) => set("autoRenewal", v)}
                  />
                  <div>
                    <div className="text-sm font-semibold text-zc-text">Auto Renewal</div>
                    <div className="text-xs text-zc-muted">
                      Automatically renew empanelment when it expires.
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Integration */}
            <TabsContent value="integration" className="mt-0">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>API Endpoint</Label>
                  <Input
                    value={form.apiEndpoint}
                    onChange={(e) => set("apiEndpoint", e.target.value)}
                    placeholder="https://api.payer.com/v1"
                  />
                  <p className="text-[11px] text-zc-muted">API endpoint for electronic claims submission.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Auth Method</Label>
                    <Select value={form.authMethod || "none"} onValueChange={(v) => set("authMethod", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Set</SelectItem>
                        <SelectItem value="OAUTH">OAuth</SelectItem>
                        <SelectItem value="BASIC">Basic Auth</SelectItem>
                        <SelectItem value="API_KEY">API Key</SelectItem>
                        <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={form.webhookUrl}
                      onChange={(e) => set("webhookUrl", e.target.value)}
                      placeholder="https://hook.example.com/claims"
                    />
                    <p className="text-[11px] text-zc-muted">For receiving claim status callbacks.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab — Payer Document Management */}
            <TabsContent value="documents" className="mt-0">
              <div className="grid gap-4">
                <div className="rounded-xl border border-blue-200/50 bg-blue-50/30 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                  <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Payer Document Management</div>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    Track empanelment letters, signed agreements, tariff schedules, panel certificates,
                    and other compliance documents. Documents are stored as references in the payer metadata.
                  </p>
                </div>

                {/* Document Type: Empanelment Letter */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-2">Empanelment Letter</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Document URL / Reference</Label>
                      <Input
                        value={(form as any).docEmpanelmentUrl || ""}
                        onChange={(e) => set("docEmpanelmentUrl" as any, e.target.value)}
                        placeholder="URL or file reference"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Expiry Date</Label>
                      <Input
                        type="date"
                        value={(form as any).docEmpanelmentExpiry || ""}
                        onChange={(e) => set("docEmpanelmentExpiry" as any, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Document Type: Agreement / MOU */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-2">Agreement / MOU</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Document URL / Reference</Label>
                      <Input
                        value={(form as any).docAgreementUrl || ""}
                        onChange={(e) => set("docAgreementUrl" as any, e.target.value)}
                        placeholder="URL or file reference"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Valid Till</Label>
                      <Input
                        type="date"
                        value={(form as any).docAgreementExpiry || ""}
                        onChange={(e) => set("docAgreementExpiry" as any, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Document Type: Tariff Schedule */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-2">Tariff Schedule</div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Document URL / Reference</Label>
                    <Input
                      value={(form as any).docTariffUrl || ""}
                      onChange={(e) => set("docTariffUrl" as any, e.target.value)}
                      placeholder="URL or file reference"
                    />
                  </div>
                </div>

                {/* Document Type: Panel Certificate */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-2">Panel Inclusion Certificate</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Document URL / Reference</Label>
                      <Input
                        value={(form as any).docPanelCertUrl || ""}
                        onChange={(e) => set("docPanelCertUrl" as any, e.target.value)}
                        placeholder="URL or file reference"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Valid Till</Label>
                      <Input
                        type="date"
                        value={(form as any).docPanelCertExpiry || ""}
                        onChange={(e) => set("docPanelCertExpiry" as any, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Rate Revision / Correspondence */}
                <div className="rounded-xl border border-zc-border p-4">
                  <div className="text-sm font-semibold mb-3">Rate Revision Letters / Correspondence</div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Document URL / Reference</Label>
                        <Input
                          value={(form as any).docCorrespondenceUrl || ""}
                          onChange={(e) => set("docCorrespondenceUrl" as any, e.target.value)}
                          placeholder="URL or file reference"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={(form as any).docCorrespondenceDate || ""}
                          onChange={(e) => set("docCorrespondenceDate" as any, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        value={(form as any).docCorrespondenceNotes || ""}
                        onChange={(e) => set("docCorrespondenceNotes" as any, e.target.value)}
                        placeholder="e.g., Annual rate revision letter"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void onSubmit()}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {dialogMode === "edit" ? "Update Payer" : "Create Payer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
