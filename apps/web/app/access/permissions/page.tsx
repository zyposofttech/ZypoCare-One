"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, RefreshCw, Search, Shield, Wand2 } from "lucide-react";

type Permission = {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
};

const PERMISSION_CATEGORIES = [
  "IAM (Identity & Access)",
  "Clinical",
  "Nursing",
  "Billing",
  "Pharmacy",
  "Inventory",
  "Diagnostics",
  "Front Office",
  "Operations",
  "Statutory",
  "AI Copilot",
  "System",
];

export default function AccessPermissionsPage() {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [perms, setPerms] = React.useState<Permission[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [cCode, setCCode] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cCategory, setCCategory] = React.useState("");
  const [cDesc, setCDesc] = React.useState("");
  const [manualCode, setManualCode] = React.useState(false);

  const load = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<Permission[]>("/api/iam/permissions");
      setPerms(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unable to load permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return perms;
    return perms.filter((p) => {
      const hay = `${p.code} ${p.name} ${p.category}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [perms, q]);

  const generateCode = (category: string, name: string) => {
    if (!category && !name) return "";
    let prefix = category.split("(")[0].trim().toUpperCase();
    prefix = prefix.replace(/[^A-Z0-9_]/g, "_");
    const suffix = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_");
    const code = prefix ? `${prefix}_${suffix}` : suffix;
    return code.replace(/_+/g, "_").replace(/^_/, "").replace(/_$/, "");
  };

  React.useEffect(() => {
    if (!openCreate || manualCode) return;
    const autoCode = generateCode(cCategory, cName);
    setCCode(autoCode);
  }, [cName, cCategory, manualCode, openCreate]);

  async function createPermission() {
    setErr(null);
    if (!cCode.trim()) return setErr("Code is required.");
    if (!cName.trim()) return setErr("Name is required.");
    if (!cCategory.trim()) return setErr("Category is required.");

    setCreating(true);
    try {
      await apiFetch("/api/iam/permissions", {
        method: "POST",
        body: JSON.stringify({
          code: cCode.toUpperCase().trim(),
          name: cName.trim(),
          category: cCategory.trim(),
          description: cDesc.trim(),
        }),
      });
      setOpenCreate(false);
      setCCode("");
      setCName("");
      setCCategory("");
      setCDesc("");
      setManualCode(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Users & Access · Permissions">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Manage the granular permission codes available to roles.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zc-muted" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search permissions"
                    className="w-[280px] pl-9"
                  />
                </div>
                <Button variant="outline" onClick={load} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="h-4 w-4" />
                  Create Permission
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {err && (
              <div className="mb-4 rounded-xl border border-zc-danger/30 bg-zc-danger/10 px-4 py-3 text-sm text-zc-danger">
                {err}
              </div>
            )}
            <div className="rounded-xl border border-zc-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length ? (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {p.code}
                        </TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.category}</Badge>
                        </TableCell>
                        <TableCell className="text-zc-muted text-sm">
                          {p.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-zc-muted">
                        No permissions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* --- Create Permission Dialog (INDIGO GLOW) --- */}
        <Dialog 
          open={openCreate} 
          onOpenChange={(v) => {
            setOpenCreate(v);
            if(!v) {
                setManualCode(false);
                setErr(null);
            }
          }}
        >
          <DialogContent 
            className="sm:max-w-[500px] border-indigo-200/50 dark:border-indigo-800/50 shadow-2xl shadow-indigo-500/10"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                   <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Create Permission
              </DialogTitle>
              <DialogDescription>
                Define a new permission code. Code is auto-generated but can be customized.
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-4" />
            
            <div className="grid gap-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select 
                        value={cCategory} 
                        onValueChange={(val) => {
                            setCCategory(val);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {PERMISSION_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Action Name</Label>
                    <Input 
                    value={cName} 
                    onChange={(e) => setCName(e.target.value)} 
                    placeholder="e.g. Delete Invoices" 
                    />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <Label>Permission Code</Label>
                    {!manualCode && cCode && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Wand2 className="h-3 w-3" /> Auto-generated
                        </span>
                    )}
                </div>
                <div className="relative">
                    <Input 
                        value={cCode} 
                        onChange={(e) => {
                            setCCode(e.target.value.toUpperCase());
                            setManualCode(true); 
                        }} 
                        placeholder="CATEGORY_ACTION_NAME" 
                        className="font-mono bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500"
                    />
                    {!manualCode && cCode && (
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute right-1 top-1 h-7 w-7 text-zc-muted hover:text-zc-text"
                            title="Edit manually"
                            onClick={() => setManualCode(true)}
                        >
                            <span className="sr-only">Edit</span>
                        </Button>
                    )}
                </div>
                <p className="text-[11px] text-zc-muted">
                    Unique identifier used in code. Example: <span className="font-mono">BILLING_INVOICE_DELETE</span>
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Input 
                  value={cDesc} 
                  onChange={(e) => setCDesc(e.target.value)} 
                  placeholder="Optional details about this permission" 
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={() => void createPermission()} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create Permission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}