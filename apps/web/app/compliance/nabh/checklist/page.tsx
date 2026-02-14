"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLink as Link } from "@/components/app-link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardCheck,
  FileText,
  Heart,
  Loader2,
  Monitor,
  Pill,
  Play,
  RefreshCw,
  Shield,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type ItemStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "VERIFIED"
  | "NON_COMPLIANT";

type RiskLevel = "CRITICAL" | "MAJOR" | "MINOR";

type NabhItem = {
  id: string;
  standardCode: string;
  meCode: string;
  title: string;
  description: string | null;
  chapter: string;
  status: ItemStatus;
  riskLevel: RiskLevel;
  evidenceRequired: boolean;
  ownerStaffId: string | null;
  owner?: { id: string; name: string } | null;
  dueDate: string | null;
  notes: string | null;
};

type StaffMember = {
  id: string;
  name: string;
};

/* ----------------------------- Constants ----------------------------- */

const CHAPTERS = [
  "Access, Assessment and Continuity of Care (AAC)",
  "Care of Patients (COP)",
  "Management of Medication (MOM)",
  "Patient Rights and Education (PRE)",
  "Hospital Infection Control (HIC)",
  "Continuous Quality Improvement (CQI)",
  "Responsibilities of Management (ROM)",
  "Facility Management and Safety (FMS)",
  "Human Resource Management (HRM)",
  "Information Management System (IMS)",
];

const CHAPTER_SHORT: Record<string, string> = {
  "Access, Assessment and Continuity of Care (AAC)": "AAC",
  "Care of Patients (COP)": "COP",
  "Management of Medication (MOM)": "MOM",
  "Patient Rights and Education (PRE)": "PRE",
  "Hospital Infection Control (HIC)": "HIC",
  "Continuous Quality Improvement (CQI)": "CQI",
  "Responsibilities of Management (ROM)": "ROM",
  "Facility Management and Safety (FMS)": "FMS",
  "Human Resource Management (HRM)": "HRM",
  "Information Management System (IMS)": "IMS",
};

const CHAPTER_ICONS: Record<string, React.ReactNode> = {
  "Access, Assessment and Continuity of Care (AAC)": <Stethoscope className="mr-2 h-4 w-4" />,
  "Care of Patients (COP)": <Heart className="mr-2 h-4 w-4" />,
  "Management of Medication (MOM)": <Pill className="mr-2 h-4 w-4" />,
  "Patient Rights and Education (PRE)": <Users className="mr-2 h-4 w-4" />,
  "Hospital Infection Control (HIC)": <Shield className="mr-2 h-4 w-4" />,
  "Continuous Quality Improvement (CQI)": <Activity className="mr-2 h-4 w-4" />,
  "Responsibilities of Management (ROM)": <ClipboardCheck className="mr-2 h-4 w-4" />,
  "Facility Management and Safety (FMS)": <Building2 className="mr-2 h-4 w-4" />,
  "Human Resource Management (HRM)": <UserPlus className="mr-2 h-4 w-4" />,
  "Information Management System (IMS)": <Monitor className="mr-2 h-4 w-4" />,
};

/* ----------------------------- Helpers ----------------------------- */

function statusLabel(status: ItemStatus): string {
  return status.replace(/_/g, " ");
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, string> = {
    VERIFIED:
      "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-300",
    IMPLEMENTED:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300",
    IN_PROGRESS:
      "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300",
    NOT_STARTED:
      "border-gray-200/70 bg-gray-50/70 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/30 dark:text-gray-300",
    NON_COMPLIANT:
      "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    CRITICAL:
      "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300",
    MAJOR:
      "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300",
    MINOR:
      "border-sky-200/70 bg-sky-50/70 text-sky-700 dark:border-sky-800/50 dark:bg-sky-900/30 dark:text-sky-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        map[level],
      )}
    >
      {level}
    </span>
  );
}

/* ----------------------------- Page ----------------------------- */

type Workspace = { id: string; name: string; branchId: string };

export default function NabhChecklistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const initialChapter = searchParams.get("chapter") ?? CHAPTERS[0];
  const [activeChapter, setActiveChapter] = React.useState(initialChapter);
  const [items, setItems] = React.useState<NabhItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [initializing, setInitializing] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<ItemStatus | "ALL">(
    "ALL",
  );
  const [riskFilter, setRiskFilter] = React.useState<RiskLevel | "ALL">("ALL");

  // Assign dialog
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignItemId, setAssignItemId] = React.useState<string | null>(null);
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);

  // Workspace resolution
  const workspaceIdFromUrl = searchParams.get("workspaceId") ?? "";
  const [workspaceId, setWorkspaceId] = React.useState(workspaceIdFromUrl);
  const [noWorkspace, setNoWorkspace] = React.useState(false);

  // Resolve workspace from branch
  React.useEffect(() => {
    if (workspaceIdFromUrl) {
      setWorkspaceId(workspaceIdFromUrl);
      setNoWorkspace(false);
      return;
    }
    if (!activeBranchId) return;
    (async () => {
      try {
        const data = await apiFetch<Workspace[] | { items: Workspace[] }>(
          `/api/compliance/workspaces?branchId=${activeBranchId}`,
        );
        const workspaces = Array.isArray(data) ? data : (data?.items ?? []);
        const ws = workspaces[0];
        if (ws) {
          setWorkspaceId(ws.id);
          setNoWorkspace(false);
        } else {
          setWorkspaceId("");
          setNoWorkspace(true);
        }
      } catch {
        setWorkspaceId("");
        setNoWorkspace(true);
      }
    })();
  }, [activeBranchId, workspaceIdFromUrl]);

  /* ---- Fetch items ---- */

  const fetchItems = React.useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("workspaceId", workspaceId);
      qs.set("chapter", activeChapter);

      const data = await apiFetch<NabhItem[] | { items: NabhItem[] }>(
        `/api/compliance/nabh/items?${qs.toString()}`,
      );
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      setItems(rows);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to load checklist items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, activeChapter]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ---- Fetch staff ---- */

  const fetchStaff = React.useCallback(async () => {
    if (!activeBranchId) return;
    try {
      const data = await apiFetch<StaffMember[] | { items: StaffMember[] }>(
        `/api/infrastructure/human-resource/staff?branchId=${activeBranchId}&limit=100`,
      );
      const rows = Array.isArray(data) ? data : (data?.items ?? []);
      setStaffList(rows);
    } catch {
      // Staff list is non-critical; silently fail
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /* ---- Filtered items ---- */

  const filteredItems = React.useMemo(() => {
    let result = items;
    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter);
    }
    if (riskFilter !== "ALL") {
      result = result.filter((item) => item.riskLevel === riskFilter);
    }
    return result;
  }, [items, statusFilter, riskFilter]);

  /* ---- Assign ---- */

  function openAssign(itemId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setAssignItemId(itemId);
    setSelectedStaffId("");
    setAssignOpen(true);
  }

  async function handleAssign() {
    if (!assignItemId || !selectedStaffId) return;
    setAssigning(true);
    try {
      await apiFetch(`/api/compliance/nabh/items/${assignItemId}`, {
        method: "PATCH",
        body: { ownerStaffId: selectedStaffId },
      });
      toast({ title: "Item assigned successfully" });
      setAssignOpen(false);
      fetchItems();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to assign item",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  }

  /* ---- Initialize checklist (seed + clone) ---- */

  async function handleInitialize() {
    if (!workspaceId) return;
    setInitializing(true);
    try {
      const result = await apiFetch<{ alreadyInitialized: boolean; itemCount: number }>(
        `/api/compliance/nabh/initialize`,
        { method: "POST", body: { workspaceId } },
      );
      toast({
        title: result.alreadyInitialized
          ? "Checklist already initialized"
          : "Checklist initialized",
        description: `${result.itemCount} NABH 6th Edition items loaded across all 10 chapters.`,
      });
      await fetchItems();
    } catch (e: any) {
      toast({
        title: "Initialization failed",
        description: e.message ?? "Failed to initialize NABH checklist",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  }

  /* ---- Navigate to detail ---- */

  function goToDetail(itemId: string) {
    router.push(`/compliance/nabh/checklist/${itemId}`);
  }

  return (
    <AppShell
      title="NABH Checklist"
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Checklist" },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_ITEM_UPDATE">
      <div className="grid gap-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <ClipboardCheck className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">NABH Checklist</div>
              <div className="mt-1 text-sm text-zc-muted">
                Review and manage compliance standards across all 10 NABH chapters.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchItems} disabled={!workspaceId}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            {workspaceId && items.length === 0 && !loading ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleInitialize}
                disabled={initializing}
              >
                {initializing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                Initialize Checklist
              </Button>
            ) : null}
          </div>
        </div>

        {/* Guard: no branch */}
        {!activeBranchId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              Select a branch to view the NABH checklist.
            </CardContent>
          </Card>
        ) : noWorkspace && !loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              No compliance workspace found for this branch. Create one in{" "}
              <Link href="/compliance/workspaces" className="text-zc-accent hover:underline">
                Workspaces
              </Link>{" "}
              first.
            </CardContent>
          </Card>
        ) : (
        <>
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-zc-muted">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as ItemStatus | "ALL")
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zc-muted">Risk Level</Label>
            <Select
              value={riskFilter}
              onValueChange={(v) =>
                setRiskFilter(v as RiskLevel | "ALL")
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Risks</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="MAJOR">Major</SelectItem>
                <SelectItem value="MINOR">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chapter Tabs */}
        <div className="overflow-x-auto">
          <Tabs value={activeChapter} onValueChange={setActiveChapter}>
            <TabsList
              className={cn(
                "h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1 w-max",
              )}
            >
              {CHAPTERS.map((ch) => (
                <TabsTrigger
                  key={ch}
                  value={ch}
                  className={cn(
                    "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                  )}
                >
                  {CHAPTER_ICONS[ch]}
                  {CHAPTER_SHORT[ch] ?? ch.slice(0, 3)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Items Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {CHAPTER_SHORT[activeChapter] ?? activeChapter.slice(0, 3)} - {activeChapter}
            </CardTitle>
          </CardHeader>
          <Separator />
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-zc-muted py-12">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
              {items.length === 0 ? (
                <>
                  <p className="mb-3">No checklist items found. Initialize the NABH 6th Edition checklist to get started.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleInitialize}
                    disabled={initializing}
                  >
                    {initializing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                    Initialize NABH Checklist
                  </Button>
                </>
              ) : (
                <p>No items found for this chapter with selected filters.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zc-panel/20 text-xs text-zc-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-[100px]">Standard</th>
                    <th className="px-4 py-3 text-left font-semibold w-[80px]">ME Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold w-[130px]">Status</th>
                    <th className="px-4 py-3 text-left font-semibold w-[90px]">Risk</th>
                    <th className="px-4 py-3 text-left font-semibold w-[140px]">Assigned To</th>
                    <th className="px-4 py-3 text-right font-semibold w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-zc-border hover:bg-zc-panel/20 cursor-pointer transition-colors"
                      onClick={() => goToDetail(item.id)}
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium">
                        {item.standardCode}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zc-muted">
                        {item.meCode}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{item.title}</div>
                        {item.description && (
                          <div className="line-clamp-1 text-xs text-zc-muted mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={item.riskLevel} />
                      </td>
                      <td className="px-4 py-3">
                        {item.owner?.name ? (
                          <span className="text-sm">
                            {item.owner.name}
                          </span>
                        ) : (
                          <span className="text-xs text-zc-muted">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Assign Staff"
                          onClick={(e) => openAssign(item.id, e)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </>
      )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff Member</DialogTitle>
            <DialogDescription>
              Select a staff member to assign this checklist item to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={assigning || !selectedStaffId}
            >
              {assigning && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </RequirePerm>
    </AppShell>
  );
}
