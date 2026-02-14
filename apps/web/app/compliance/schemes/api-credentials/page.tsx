"use client";

import * as React from "react";
import { AppLink as Link } from "@/components/app-link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { RequirePerm } from "@/components/RequirePerm";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Shield,
  Zap,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type SchemeType = "PMJAY" | "CGHS" | "ECHS";
type EnvironmentType = "SANDBOX" | "PRODUCTION";

type SchemeApiCredential = {
  id: string;
  workspaceId: string;
  scheme: SchemeType;
  apiKeyEnc: string | null;
  apiSecretEnc: string | null;
  baseUrl: string | null;
  environment: EnvironmentType;
  status: "NOT_CONFIGURED" | "CONFIGURED" | "TESTED";
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Workspace = {
  id: string;
  name: string;
  branchId: string;
};

/* --------------------------------- Helpers -------------------------------- */

function statusBadgeClass(status: SchemeApiCredential["status"] | null) {
  if (!status || status === "NOT_CONFIGURED")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  if (status === "TESTED")
    return "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200";
  return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
}

function statusLabel(status: SchemeApiCredential["status"] | null) {
  if (!status || status === "NOT_CONFIGURED") return "Not Configured";
  if (status === "TESTED") return "Tested";
  return "Configured";
}

const SCHEME_OPTIONS: { value: SchemeType; label: string }[] = [
  { value: "PMJAY", label: "PM-JAY (Ayushman Bharat)" },
  { value: "CGHS", label: "CGHS" },
  { value: "ECHS", label: "ECHS" },
];

/* --------------------------------- Page ---------------------------------- */

export default function SchemeApiCredentialsPage() {
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);

  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [credentialId, setCredentialId] = React.useState<string | null>(null);
  const [activeScheme, setActiveScheme] = React.useState<SchemeType>("PMJAY");
  const [activeEnv, setActiveEnv] = React.useState<EnvironmentType>("SANDBOX");

  // Form state
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [status, setStatus] = React.useState<SchemeApiCredential["status"]>("NOT_CONFIGURED");

  const fetchCredential = React.useCallback(
    async (wsId: string, scheme: SchemeType, env: EnvironmentType) => {
      setLoading(true);
      try {
        const cred = await apiFetch<SchemeApiCredential | null>(
          `/api/compliance/schemes/api-credentials?workspaceId=${wsId}&scheme=${scheme}&environment=${env}`,
        );
        if (cred && cred.id) {
          setCredentialId(cred.id);
          setApiKey(cred.apiKeyEnc ?? "");
          setApiSecret(cred.apiSecretEnc ?? "");
          setBaseUrl(cred.baseUrl ?? "");
          setStatus(cred.status ?? "NOT_CONFIGURED");
        } else {
          resetForm();
        }
      } catch {
        resetForm();
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function resetForm() {
    setCredentialId(null);
    setApiKey("");
    setApiSecret("");
    setBaseUrl("");
    setStatus("NOT_CONFIGURED");
  }

  // Load workspace on branch change
  React.useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);

    (async () => {
      try {
        const data = await apiFetch<Workspace[] | { items: Workspace[] }>(
          `/api/compliance/workspaces?branchId=${activeBranchId}`,
        );
        const workspaces = Array.isArray(data) ? data : (data?.items ?? []);
        const ws = workspaces[0];
        if (ws) {
          setWorkspaceId(ws.id);
          await fetchCredential(ws.id, activeScheme, activeEnv);
        } else {
          setWorkspaceId(null);
          resetForm();
          setLoading(false);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e.message ?? "Failed to load workspace",
          variant: "destructive",
        });
        setLoading(false);
      }
    })();
  }, [activeBranchId]);

  // Re-fetch when scheme or environment changes
  React.useEffect(() => {
    if (!workspaceId) return;
    fetchCredential(workspaceId, activeScheme, activeEnv);
  }, [activeScheme, activeEnv, workspaceId, fetchCredential]);

  async function handleSave() {
    if (!workspaceId) return;

    if (!apiKey.trim()) {
      toast({ title: "Validation Error", description: "API Key is required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        workspaceId,
        scheme: activeScheme,
        environment: activeEnv,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        baseUrl: baseUrl.trim(),
      };

      const result = await apiFetch<SchemeApiCredential>(
        `/api/compliance/schemes/api-credentials`,
        { method: "POST", body },
      );
      setCredentialId(result.id);
      setStatus(result.status ?? "CONFIGURED");
      toast({ title: "Credentials Saved", description: `${activeScheme} API credentials saved successfully.` });
    } catch (e: any) {
      toast({ title: "Save Failed", description: e.message ?? "Failed to save credentials.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!credentialId) {
      toast({ title: "Cannot Test", description: "Save the credentials first before testing.", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      await apiFetch(`/api/compliance/schemes/api-credentials/${credentialId}/test`, {
        method: "POST",
        body: {},
      });
      toast({ title: "Connection Successful", description: `${activeScheme} API connection test passed.` });
      setStatus("TESTED");
    } catch (e: any) {
      toast({ title: "Connection Failed", description: e.message ?? "API connection test failed.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell title="Scheme API Credentials">
      <RequirePerm perm="COMPLIANCE_SCHEME_EMPANEL">
      <div className="grid gap-6">
        {/* -- Header ---------------------------------------------------- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/compliance/schemes">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-zc-border">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Key className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">Scheme API Credentials</div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure API credentials for government health scheme integrations (PMJAY, CGHS, ECHS).
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                statusBadgeClass(status),
              )}
            >
              {statusLabel(status)}
            </span>
          </div>
        </div>

        {/* -- Guard states ---------------------------------------------- */}
        {!activeBranchId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              Select a branch to configure scheme API credentials.
            </CardContent>
          </Card>
        ) : !workspaceId && !loading ? (
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
            {/* -- Scheme selector --------------------------------------- */}
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-zc-muted whitespace-nowrap">Scheme</Label>
              <Select value={activeScheme} onValueChange={(v) => setActiveScheme(v as SchemeType)}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* -- Environment tabs -------------------------------------- */}
            <Tabs value={activeEnv} onValueChange={(v) => setActiveEnv(v as EnvironmentType)}>
              <TabsList
                className={cn(
                  "h-10 rounded-2xl border border-zc-border bg-zc-panel/20 p-1",
                )}
              >
                <TabsTrigger
                  value="SANDBOX"
                  className={cn(
                    "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                  )}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Sandbox
                </TabsTrigger>
                <TabsTrigger
                  value="PRODUCTION"
                  className={cn(
                    "rounded-xl px-3 data-[state=active]:bg-zc-accent data-[state=active]:text-white data-[state=active]:shadow-sm",
                  )}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Production
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeEnv} className="mt-4 grid gap-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-zc-muted" />
                  </div>
                ) : (
                  <>
                    {/* -- Credentials Card -------------------------------- */}
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">API Credentials</CardTitle>
                        <CardDescription>
                          {activeEnv === "SANDBOX"
                            ? `Sandbox credentials for testing ${activeScheme} integration.`
                            : `Production credentials for live ${activeScheme} integration. Handle with care.`}
                        </CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                              id="apiKey"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder={`Enter ${activeScheme} API Key`}
                              disabled={saving}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apiSecret">API Secret</Label>
                            <div className="relative">
                              <Input
                                id="apiSecret"
                                type={showSecret ? "text" : "password"}
                                value={apiSecret}
                                onChange={(e) => setApiSecret(e.target.value)}
                                placeholder={`Enter ${activeScheme} API Secret`}
                                disabled={saving}
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zc-muted hover:text-zc-text"
                              >
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="baseUrl">Base URL</Label>
                          <Input
                            id="baseUrl"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder={
                              activeEnv === "SANDBOX"
                                ? "https://sandbox.pmjay.gov.in/api"
                                : "https://api.pmjay.gov.in/api"
                            }
                            disabled={saving}
                          />
                          <p className="text-xs text-zc-muted">
                            The base endpoint URL for the {activeScheme} API. Leave blank to use the default.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* -- Actions ------------------------------------------ */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleTestConnection}
                        disabled={saving || testing || !credentialId}
                      >
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Test Connection
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            if (workspaceId) fetchCredential(workspaceId, activeScheme, activeEnv);
                          }}
                          disabled={saving || testing}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Reset
                        </Button>
                        <Button
                          variant="primary"
                          className="gap-2"
                          onClick={handleSave}
                          disabled={saving || testing}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Credentials
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      </RequirePerm>
    </AppShell>
  );
}
