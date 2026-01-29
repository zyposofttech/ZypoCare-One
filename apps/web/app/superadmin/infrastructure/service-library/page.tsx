"use client";

import * as React from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

import { BookOpen, Link2, Plus, RefreshCw, Search, Trash2, Wrench } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type BranchRow = { id: string; code: string; name: string; city?: string | null };

type ServiceItemRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  category?: string | null;
  isActive?: boolean;
};

type CodeSetRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  kind?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CodeEntryRow = {
  id: string;
  codeSetId: string;
  code: string;
  display: string;
  description?: string | null;
  status?: string | null;
  meta?: any;
};

type MappingRow = {
  id: string;
  branchId: string;
  serviceItemId: string;
  codeEntryId: string;
  isPrimary?: boolean;
  meta?: any;
  codeEntry?: CodeEntryRow | null;
  serviceItem?: ServiceItemRow | null;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

const LS_BRANCH = "zc.superadmin.infrastructure.branchId";

function readLS(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

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

function ModalHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            {icon}
          </div>
          {title}
        </DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <Separator className="my-4" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ServiceLibraryPage() {
  const { toast } = useToast();

  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<BranchRow[]>([]);
  const [branchId, setBranchId] = React.useState<string | undefined>(undefined);

  const [activeTab, setActiveTab] = React.useState<"sets" | "entries" | "mappings">("sets");

  // Code sets
  const [qSets, setQSets] = React.useState("");
  const [includeInactiveSets, setIncludeInactiveSets] = React.useState(false);
  const [codeSets, setCodeSets] = React.useState<CodeSetRow[]>([]);

  // Entries
  const [codeSetId, setCodeSetId] = React.useState<string | undefined>(undefined);
  const [qEntries, setQEntries] = React.useState("");
  const [entries, setEntries] = React.useState<CodeEntryRow[]>([]);

  // Mappings
  const [qMappings, setQMappings] = React.useState("");
  const [mappings, setMappings] = React.useState<MappingRow[]>([]);

  // Dialogs
  const [setOpen, setSetOpen] = React.useState(false);
  const [editingSet, setEditingSet] = React.useState<CodeSetRow | null>(null);
  const [setCode, setSetCode] = React.useState("");
  const [setName, setSetName] = React.useState("");
  const [setKind, setSetKind] = React.useState("");
  const [setDesc, setSetDesc] = React.useState("");

  const [entryOpen, setEntryOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<CodeEntryRow | null>(null);
  const [entryCode, setEntryCode] = React.useState("");
  const [entryDisplay, setEntryDisplay] = React.useState("");
  const [entryDesc, setEntryDesc] = React.useState("");
  const [entryStatus, setEntryStatus] = React.useState("");
  const [entryMeta, setEntryMeta] = React.useState("");

  const [mapOpen, setMapOpen] = React.useState(false);
  const [mapSetId, setMapSetId] = React.useState<string | undefined>(undefined);
  const [mapEntryId, setMapEntryId] = React.useState<string | undefined>(undefined);
  const [mapIsPrimary, setMapIsPrimary] = React.useState(true);
  const [svcQuery, setSvcQuery] = React.useState("");
  const [svcOptions, setSvcOptions] = React.useState<ServiceItemRow[]>([]);
  const [mapSvcId, setMapSvcId] = React.useState<string | undefined>(undefined);
  const [mapMeta, setMapMeta] = React.useState("");

  async function loadBranches() {
    const list = (await apiFetch<BranchRow[]>("/api/branches")) || [];
    setBranches(list);

    const stored = readLS(LS_BRANCH);
    const first = list[0]?.id;
    const next = (stored && list.some((b) => b.id === stored) ? stored : undefined) || first || undefined;

    setBranchId(next);
    if (next) writeLS(LS_BRANCH, next);
  }

  async function loadCodeSets() {
    if (!branchId) {
      setCodeSets([]);
      return;
    }
    const qs = buildQS({ branchId, q: qSets.trim() || undefined, includeInactive: includeInactiveSets ? "true" : undefined });
    const list = await apiFetch<CodeSetRow[]>(`/api/infrastructure/service-library/code-sets?${qs}`);
    setCodeSets(list || []);

    // keep selected code set sane
    if (!codeSetId) {
      const first = list?.[0]?.id;
      if (first) setCodeSetId(first);
    } else if (list && !list.some((s) => s.id === codeSetId)) {
      setCodeSetId(list[0]?.id);
    }

    if (!mapSetId) {
      const first = list?.[0]?.id;
      if (first) setMapSetId(first);
    } else if (list && !list.some((s) => s.id === mapSetId)) {
      setMapSetId(list[0]?.id);
    }
  }

  async function loadEntries() {
    if (!codeSetId) {
      setEntries([]);
      return;
    }
    const qs = buildQS({ q: qEntries.trim() || undefined });
    const list = await apiFetch<CodeEntryRow[]>(`/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSetId)}/entries?${qs}`);
    setEntries(list || []);

    if (!mapEntryId) {
      const first = list?.[0]?.id;
      if (first) setMapEntryId(first);
    } else if (list && !list.some((e) => e.id === mapEntryId)) {
      setMapEntryId(list[0]?.id);
    }
  }

  async function loadMappings() {
    if (!branchId) {
      setMappings([]);
      return;
    }
    const qs = buildQS({ branchId, q: qMappings.trim() || undefined, codeSetId: mapSetId || undefined });
    const list = await apiFetch<MappingRow[]>(`/api/infrastructure/service-library/mappings?${qs}`);
    setMappings(list || []);
  }

  async function refreshAll(showToast = false) {
    setBusy(true);
    setErr(null);
    try {
      await loadBranches();
      await loadCodeSets();
      await loadEntries();
      await loadMappings();
      if (showToast) toast({ title: "Refreshed", description: "Service library loaded successfully." });
    } catch (e: any) {
      const msg = e?.message || "Refresh failed.";
      setErr(msg);
      if (showToast) toast({ title: "Refresh failed", description: msg, variant: "destructive" as any });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refreshAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!branchId) return;
    writeLS(LS_BRANCH, branchId);
    void loadCodeSets().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  React.useEffect(() => {
    const t = setTimeout(() => void loadCodeSets().catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qSets, includeInactiveSets]);

  React.useEffect(() => {
    if (!codeSetId) return;
    const t = setTimeout(() => void loadEntries().catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeSetId, qEntries]);

  React.useEffect(() => {
    if (!branchId) return;
    const t = setTimeout(() => void loadMappings().catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, qMappings, mapSetId]);

  React.useEffect(() => {
    if (!branchId) return;
    if (!svcQuery.trim()) {
      setSvcOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const qs = buildQS({ branchId, q: svcQuery.trim() || undefined, includeInactive: "true" });
        const list = await apiFetch<ServiceItemRow[]>(`/api/infrastructure/services?${qs}`);
        setSvcOptions(list || []);
      } catch {
        setSvcOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [svcQuery, branchId]);

  function resetSetForm(row?: CodeSetRow | null) {
    setEditingSet(row || null);
    setSetCode(row?.code || "");
    setSetName(row?.name || "");
    setSetKind(row?.kind || "");
    setSetDesc(row?.description || "");
  }

  function resetEntryForm(row?: CodeEntryRow | null) {
    setEditingEntry(row || null);
    setEntryCode(row?.code || "");
    setEntryDisplay(row?.display || "");
    setEntryDesc(row?.description || "");
    setEntryStatus(row?.status || "");
    setEntryMeta(row?.meta ? JSON.stringify(row.meta, null, 2) : "");
  }

  function resetMapForm() {
    setMapEntryId(undefined);
    setMapSvcId(undefined);
    setSvcQuery("");
    setSvcOptions([]);
    setMapIsPrimary(true);
    setMapMeta("");
  }

  async function saveCodeSet() {
    if (!branchId) return;
    const payload: any = {
      code: setCode.trim(),
      name: setName.trim(),
      description: setDesc.trim() ? setDesc.trim() : null,
      kind: setKind.trim() ? setKind.trim() : null,
    };

    try {
      if (editingSet?.id) {
        await apiFetch(`/api/infrastructure/service-library/code-sets/${encodeURIComponent(editingSet.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/infrastructure/service-library/code-sets?branchId=${encodeURIComponent(branchId)}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      toast({ title: "Saved", description: "Code set saved successfully." });
      setSetOpen(false);
      await loadCodeSets();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Could not save code set.", variant: "destructive" as any });
    }
  }

  async function saveEntry() {
    if (!codeSetId) return;

    let meta: any = undefined;
    if (entryMeta.trim()) {
      try {
        meta = JSON.parse(entryMeta);
      } catch {
        toast({ title: "Invalid JSON", description: "Entry meta must be valid JSON.", variant: "destructive" as any });
        return;
      }
    }

    const payload: any = {
      code: entryCode.trim(),
      display: entryDisplay.trim(),
      description: entryDesc.trim() ? entryDesc.trim() : null,
      status: entryStatus.trim() ? entryStatus.trim() : null,
      meta,
    };

    try {
      await apiFetch(`/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSetId)}/entries`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({ title: "Saved", description: "Entry saved successfully." });
      setEntryOpen(false);
      await loadEntries();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Could not save entry.", variant: "destructive" as any });
    }
  }

  async function deleteEntry(code: string) {
    if (!codeSetId) return;
    const ok = window.confirm(`Remove entry '${code}'?`);
    if (!ok) return;

    try {
      await apiFetch(`/api/infrastructure/service-library/code-sets/${encodeURIComponent(codeSetId)}/entries/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      toast({ title: "Deleted", description: "Entry removed." });
      await loadEntries();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Could not delete entry.", variant: "destructive" as any });
    }
  }

  async function createMapping() {
    if (!branchId) return;
    if (!mapEntryId || !mapSvcId) {
      toast({ title: "Missing fields", description: "Select a code entry and service item.", variant: "destructive" as any });
      return;
    }

    let meta: any = undefined;
    if (mapMeta.trim()) {
      try {
        meta = JSON.parse(mapMeta);
      } catch {
        toast({ title: "Invalid JSON", description: "Mapping meta must be valid JSON.", variant: "destructive" as any });
        return;
      }
    }

    try {
      await apiFetch(`/api/infrastructure/service-library/mappings?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ serviceItemId: mapSvcId, codeEntryId: mapEntryId, isPrimary: mapIsPrimary, meta }),
      });
      toast({ title: "Mapped", description: "Mapping created successfully." });
      setMapOpen(false);
      resetMapForm();
      await loadMappings();
    } catch (e: any) {
      toast({ title: "Mapping failed", description: e?.message || "Could not create mapping.", variant: "destructive" as any });
    }
  }

  async function deleteMapping(id: string) {
    if (!branchId) return;
    const ok = window.confirm("Remove this mapping?");
    if (!ok) return;

    try {
      await apiFetch(`/api/infrastructure/service-library/mappings/${encodeURIComponent(id)}?branchId=${encodeURIComponent(branchId)}`, {
        method: "DELETE",
      });
      toast({ title: "Deleted", description: "Mapping removed." });
      await loadMappings();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Could not delete mapping.", variant: "destructive" as any });
    }
  }

  const mustSelectBranch = !branchId;

  return (
    <AppShell title="Infrastructure - Service Library">
      <div className="grid gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <BookOpen className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Service Library</div>
              <div className="mt-1 text-sm text-zc-muted">
                Maintain standard code sets, entries, and map them to your Service Items.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="px-5 gap-2" onClick={() => void refreshAll(true)} disabled={busy || loading}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button
              variant="primary"
              className="px-5 gap-2"
              onClick={() => {
                resetSetForm(null);
                setSetOpen(true);
              }}
              disabled={mustSelectBranch || busy || loading}
            >
              <Plus className="h-4 w-4" />
              New code set
            </Button>
            <Button
              variant="outline"
              className="px-5 gap-2"
              onClick={() => {
                resetMapForm();
                setMapOpen(true);
              }}
              disabled={mustSelectBranch || !codeSets.length || busy || loading}
            >
              <Link2 className="h-4 w-4" />
              Map service to code
            </Button>
          </div>
        </div>
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription className="text-sm">
              Select a branch, review library coverage, and manage code sets, entries, and mappings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={(v) => setBranchId(v)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-zc-border bg-zc-card">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] overflow-y-auto">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code}){b.city ? ` - ${b.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Code sets</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{codeSets.length}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Entries</div>
                <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{entries.length}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Mappings</div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">{mappings.length}</div>
              </div>
            </div>

            {err ? (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/60 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                {err}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Manage Service Library</CardTitle>
                <CardDescription>Create code sets, maintain entries, and link them to orderable services.</CardDescription>
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className={cn("h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1")}>
                  <TabsTrigger value="sets" className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Code sets
                  </TabsTrigger>
                  <TabsTrigger value="entries" className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Entries
                  </TabsTrigger>
                  <TabsTrigger value="mappings" className={cn("rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm")}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Mappings
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            {loading ? (
              <div className="grid gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-52" />
              </div>
            ) : null}

            <Tabs value={activeTab}>
              {/* Code sets */}
              <TabsContent value="sets" className="mt-0">
                <div className="grid gap-3">
                  <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <Label className="text-xs text-zc-muted">Search</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zc-muted" />
                        <Input
                          className="pl-9 rounded-xl"
                          value={qSets}
                          onChange={(e) => setQSets(e.target.value)}
                          placeholder="Search by code or name…"
                          disabled={mustSelectBranch}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs text-zc-muted">Include inactive</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Switch checked={includeInactiveSets} onCheckedChange={setIncludeInactiveSets} disabled={mustSelectBranch} />
                        <span className="text-sm text-zc-muted">Show inactive sets</span>
                      </div>
                    </div>
                    <div className="md:col-span-3 flex items-end justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetSetForm(null);
                          setSetOpen(true);
                        }}
                        disabled={mustSelectBranch}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zc-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[170px]">Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[140px]">Kind</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                          <TableHead className="w-[160px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {codeSets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-sm text-zc-muted">
                              {mustSelectBranch ? "Select a branch to manage library." : "No code sets yet."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          codeSets.map((cs) => (
                            <TableRow
                              key={cs.id}
                              className={cn(codeSetId === cs.id ? "bg-zc-accent/10" : "")}
                              onClick={() => {
                                setCodeSetId(cs.id);
                                setActiveTab("entries");
                              }}
                            >
                              <TableCell className="font-mono text-xs">{cs.code}</TableCell>
                              <TableCell>
                                <div className="font-medium text-zc-text">{cs.name}</div>
                                {cs.description ? <div className="text-xs text-zc-muted line-clamp-1">{cs.description}</div> : null}
                              </TableCell>
                              <TableCell>{cs.kind || <span className="text-zc-muted">—</span>}</TableCell>
                              <TableCell>{cs.isActive === false ? <Badge variant="secondary">Inactive</Badge> : <Badge variant="success">Active</Badge>}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resetSetForm(cs);
                                    setSetOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Entries */}
              <TabsContent value="entries" className="mt-0">
                <div className="grid gap-3">
                  <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <Label className="text-xs text-zc-muted">Code set</Label>
                      <Select value={codeSetId} onValueChange={(v) => setCodeSetId(v)} disabled={!codeSets.length}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select code set" />
                        </SelectTrigger>
                        <SelectContent>
                          {codeSets.map((cs) => (
                            <SelectItem key={cs.id} value={cs.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-zc-muted">{cs.code}</span>
                                <span>{cs.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-5">
                      <Label className="text-xs text-zc-muted">Search entries</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zc-muted" />
                        <Input
                          className="pl-9 rounded-xl"
                          value={qEntries}
                          onChange={(e) => setQEntries(e.target.value)}
                          placeholder="Search by code/display…"
                          disabled={!codeSetId}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3 flex items-end justify-end">
                      <Button
                        onClick={() => {
                          resetEntryForm(null);
                          setEntryOpen(true);
                        }}
                        disabled={!codeSetId}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add entry
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zc-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[170px]">Code</TableHead>
                          <TableHead>Display</TableHead>
                          <TableHead className="w-[140px]">Status</TableHead>
                          <TableHead className="w-[200px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                              {codeSetId ? "No entries." : "Select a code set."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          entries.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-mono text-xs">{e.code}</TableCell>
                              <TableCell>
                                <div className="font-medium text-zc-text">{e.display}</div>
                                {e.description ? <div className="text-xs text-zc-muted line-clamp-1">{e.description}</div> : null}
                              </TableCell>
                              <TableCell>{e.status ? <Badge variant="secondary">{e.status}</Badge> : <span className="text-zc-muted">—</span>}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      resetEntryForm(e);
                                      setEntryOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => void deleteEntry(e.code)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Mappings */}
              <TabsContent value="mappings" className="mt-0">
                <div className="grid gap-3">
                  <div className="grid gap-3 rounded-xl border border-zc-border bg-zc-panel/20 p-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <Label className="text-xs text-zc-muted">Filter by code set</Label>
                      <Select value={mapSetId} onValueChange={(v) => setMapSetId(v)} disabled={!codeSets.length}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="All sets" />
                        </SelectTrigger>
                        <SelectContent>
                          {codeSets.map((cs) => (
                            <SelectItem key={cs.id} value={cs.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-zc-muted">{cs.code}</span>
                                <span>{cs.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-5">
                      <Label className="text-xs text-zc-muted">Search mappings</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zc-muted" />
                        <Input className="pl-9 rounded-xl" value={qMappings} onChange={(e) => setQMappings(e.target.value)} placeholder="Search by service / code / display…" disabled={mustSelectBranch} />
                      </div>
                    </div>

                    <div className="md:col-span-3 flex items-end justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetMapForm();
                          setMapOpen(true);
                        }}
                        disabled={mustSelectBranch || !codeSets.length}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New mapping
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zc-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service Item</TableHead>
                          <TableHead>Code Entry</TableHead>
                          <TableHead className="w-[120px]">Primary</TableHead>
                          <TableHead className="w-[120px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                              {mustSelectBranch ? "Select a branch." : "No mappings."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          mappings.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>
                                {m.serviceItem ? (
                                  <div>
                                    <div className="font-medium text-zc-text">{m.serviceItem.name}</div>
                                    <div className="text-xs text-zc-muted">
                                      <span className="font-mono">{m.serviceItem.code}</span>
                                      {m.serviceItem.category ? <span className="mx-1 text-zc-muted/60">•</span> : null}
                                      {m.serviceItem.category ? <span>{m.serviceItem.category}</span> : null}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zc-muted">{m.serviceItemId}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {m.codeEntry ? (
                                  <div>
                                    <div className="font-medium text-zc-text">{m.codeEntry.display}</div>
                                    <div className="text-xs text-zc-muted">
                                      <span className="font-mono">{m.codeEntry.code}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zc-muted">{m.codeEntryId}</span>
                                )}
                              </TableCell>
                              <TableCell>{m.isPrimary ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="destructive" onClick={() => void deleteMapping(m.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Code set dialog */}
        <Dialog open={setOpen} onOpenChange={setSetOpen}>
          <DialogContent className={drawerClassName("max-w-[720px]")}>
            <ModalHeader
              title={editingSet ? "Edit code set" : "New code set"}
              description="Define a standard code system (e.g., CPT-like, LOINC-like internal sets)."
              icon={<BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label className="text-xs text-zc-muted">Code</Label>
                <Input className="rounded-xl" value={setCode} onChange={(e) => setSetCode(e.target.value)} placeholder="LAB_TESTS" />
              </div>
              <div className="md:col-span-8">
                <Label className="text-xs text-zc-muted">Name</Label>
                <Input className="rounded-xl" value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="Laboratory test codes" />
              </div>
              <div className="md:col-span-4">
                <Label className="text-xs text-zc-muted">Kind (optional)</Label>
                <Input className="rounded-xl" value={setKind} onChange={(e) => setSetKind(e.target.value)} placeholder="LAB" />
              </div>
              <div className="md:col-span-8">
                <Label className="text-xs text-zc-muted">Description</Label>
                <Input className="rounded-xl" value={setDesc} onChange={(e) => setSetDesc(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setSetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveCodeSet()} disabled={!setCode.trim() || !setName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entry dialog */}
        <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
          <DialogContent className={drawerClassName("p-0")}>
            <div className="p-6">
              <ModalHeader
                title={editingEntry ? "Edit entry" : "New entry"}
                description="Upsert an entry by code. Use meta JSON for advanced payloads."
                icon={<Wrench className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
              />

              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label className="text-xs text-zc-muted">Code</Label>
                  <Input className="rounded-xl" value={entryCode} onChange={(e) => setEntryCode(e.target.value)} placeholder="HB" disabled={!!editingEntry} />
                </div>
                <div className="md:col-span-8">
                  <Label className="text-xs text-zc-muted">Display</Label>
                  <Input className="rounded-xl" value={entryDisplay} onChange={(e) => setEntryDisplay(e.target.value)} placeholder="Hemoglobin" />
                </div>

                <div className="md:col-span-12">
                  <Label className="text-xs text-zc-muted">Description</Label>
                  <Input className="rounded-xl" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} placeholder="Optional" />
                </div>

                <div className="md:col-span-4">
                  <Label className="text-xs text-zc-muted">Status (optional)</Label>
                  <Input className="rounded-xl" value={entryStatus} onChange={(e) => setEntryStatus(e.target.value)} placeholder="ACTIVE" />
                </div>

                <div className="md:col-span-8">
                  <Label className="text-xs text-zc-muted">Meta JSON (optional)</Label>
                  <Textarea className="min-h-[120px] rounded-xl font-mono text-xs" value={entryMeta} onChange={(e) => setEntryMeta(e.target.value)} placeholder='{\n  "loinc": "718-7"\n}' />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEntryOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveEntry()} disabled={!entryCode.trim() || !entryDisplay.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mapping dialog */}
        <Dialog open={mapOpen} onOpenChange={setMapOpen}>
          <DialogContent className={drawerClassName("max-w-[860px]")}>
            <ModalHeader
              title="Map service to code"
              description="Create a mapping between a Service Item and a Code Entry."
              icon={<Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            />

            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label className="text-xs text-zc-muted">Code set</Label>
                <Select value={mapSetId} onValueChange={(v) => setMapSetId(v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select set" />
                  </SelectTrigger>
                  <SelectContent>
                    {codeSets.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zc-muted">{cs.code}</span>
                          <span>{cs.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-8">
                <Label className="text-xs text-zc-muted">Code entry</Label>
                <Select value={mapEntryId} onValueChange={(v) => setMapEntryId(v)} disabled={!entries.length}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={mapSetId ? "Select entry" : "Select set first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {entries.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zc-muted">{e.code}</span>
                          <span>{e.display}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6">
                <Label className="text-xs text-zc-muted">Find Service Item</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zc-muted" />
                  <Input className="pl-9 rounded-xl" value={svcQuery} onChange={(e) => setSvcQuery(e.target.value)} placeholder="Type code/name…" />
                </div>
                {svcOptions.length ? (
                  <div className="mt-2 max-h-[200px] overflow-auto rounded-xl border border-zc-border">
                    <Table>
                      <TableBody>
                        {svcOptions.slice(0, 20).map((s) => (
                          <TableRow
                            key={s.id}
                            className={cn(mapSvcId === s.id ? "bg-zc-accent/10" : "cursor-pointer")}
                            onClick={() => setMapSvcId(s.id)}
                          >
                            <TableCell>
                              <div className="font-medium text-zc-text">{s.name}</div>
                              <div className="text-xs text-zc-muted">
                                <span className="font-mono">{s.code}</span>
                                {s.category ? <span className="mx-1 text-zc-muted/60">•</span> : null}
                                {s.category ? <span>{s.category}</span> : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-zc-muted">Search for a service item to map.</div>
                )}
              </div>

              <div className="md:col-span-6">
                <Label className="text-xs text-zc-muted">Options</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Switch checked={mapIsPrimary} onCheckedChange={setMapIsPrimary} />
                  <span className="text-sm text-zc-muted">Primary mapping</span>
                </div>

                <div className="mt-3">
                  <Label className="text-xs text-zc-muted">Meta JSON (optional)</Label>
                  <Textarea className="min-h-[160px] rounded-xl font-mono text-xs" value={mapMeta} onChange={(e) => setMapMeta(e.target.value)} placeholder='{\n  "source": "legacy"\n}' />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setMapOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createMapping()} disabled={!mapEntryId || !mapSvcId}>
                Save mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

