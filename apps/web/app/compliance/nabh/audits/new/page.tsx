"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import { ArrowLeft, Loader2, Save, Plus } from "lucide-react";

/* ----------------------------- Types ----------------------------- */

type AuditType = "INTERNAL" | "EXTERNAL" | "PRE_ASSESSMENT" | "FINAL_ASSESSMENT";

type StaffMember = {
  id: string;
  name: string;
};

/* ----------------------------- Page ----------------------------- */

export default function NewAuditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { activeBranchId } = useBranchContext();

  const [saving, setSaving] = React.useState(false);

  // Form fields
  const [name, setName] = React.useState("");
  const [auditType, setAuditType] = React.useState<AuditType>("INTERNAL");
  const [plannedStartDate, setPlannedStartDate] = React.useState("");
  const [plannedEndDate, setPlannedEndDate] = React.useState("");
  const [leadAuditorStaffId, setLeadAuditorStaffId] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Staff list for lead auditor picker
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);

  /* ---- Fetch staff ---- */

  const fetchStaff = React.useCallback(async () => {
    if (!activeBranchId) return;
    try {
      const data = await apiFetch<StaffMember[]>(
        `/api/infrastructure/human-resource/staff?branchId=${activeBranchId}&limit=100`,
      );
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      // Staff list is non-critical
    }
  }, [activeBranchId]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /* ---- Submit ---- */

  async function handleSubmit() {
    if (!name.trim()) {
      toast({
        title: "Validation",
        description: "Audit name is required",
        variant: "destructive",
      });
      return;
    }
    if (!plannedStartDate) {
      toast({
        title: "Validation",
        description: "Start date is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await apiFetch<{ id: string }>(
        "/api/compliance/nabh/audits",
        {
          method: "POST",
          body: {
            name: name.trim(),
            type: auditType,
            plannedStartDate,
            plannedEndDate: plannedEndDate || null,
            leadAuditorStaffId: leadAuditorStaffId || null,
            scope: scope.trim() || null,
            notes: notes.trim() || null,
            branchId: activeBranchId,
          },
        },
      );
      toast({ title: "Audit cycle created" });
      router.push(`/compliance/nabh/audits/${result.id}`);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "Failed to create audit cycle",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Create Audit Cycle"
      breadcrumbs={[
        { label: "Compliance", href: "/compliance" },
        { label: "NABH", href: "/compliance/nabh" },
        { label: "Audits", href: "/compliance/nabh/audits" },
        { label: "New Audit" },
      ]}
    >
      <RequirePerm perm="COMPLIANCE_NABH_AUDIT">
      <div className="grid gap-6 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/compliance/nabh/audits")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Plus className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">New Audit Cycle</div>
              <div className="mt-1 text-sm text-zc-muted">
                Create a new internal or external NABH audit cycle.
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audit Details</CardTitle>
            <CardDescription>
              Fill in the audit cycle information below.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audit-name">
                Audit Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="audit-name"
                placeholder="e.g. Internal Audit Q1 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audit-type">
                Audit Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={auditType}
                onValueChange={(v) => setAuditType(v as AuditType)}
              >
                <SelectTrigger id="audit-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                  <SelectItem value="PRE_ASSESSMENT">Pre-Assessment</SelectItem>
                  <SelectItem value="FINAL_ASSESSMENT">
                    Final Assessment
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">
                  Planned Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Planned End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-auditor">Lead Auditor</Label>
              <Select
                value={leadAuditorStaffId}
                onValueChange={setLeadAuditorStaffId}
              >
                <SelectTrigger id="lead-auditor">
                  <SelectValue placeholder="Select lead auditor" />
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

            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <Textarea
                id="scope"
                placeholder="Define the scope of this audit cycle..."
                rows={3}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/compliance/nabh/audits")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Create Audit
          </Button>
        </div>
      </div>
      </RequirePerm>
    </AppShell>
  );
}
