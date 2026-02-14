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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Shield,
  Zap,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type AbdmEnvironment = "SANDBOX" | "PRODUCTION";

type AbdmConfigApi = {
  id: string;
  workspaceId: string;
  environment: AbdmEnvironment;

  clientId?: string | null;
  clientSecretEnc?: string | null;

  callbackUrls?: string[]; // ✅ backend shape
  featureTogglesJson?: any; // ✅ backend shape

  status: "NOT_CONFIGURED" | "CONFIGURED" | "TESTED";
  lastTestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Workspace = {
  id: string;
  name: string;
  branchId: string;
};

/* --------------------------------- Helpers -------------------------------- */

function statusBadgeClass(status: AbdmConfigApi["status"] | null) {
  if (!status || status === "NOT_CONFIGURED")
    return "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200";
  if (status === "TESTED")
    return "border-green-200/70 bg-green-50/70 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200";
  return "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";
}

function statusLabel(status: AbdmConfigApi["status"] | null) {
  if (!status || status === "NOT_CONFIGURED") return "Not Configured";
  if (status === "TESTED") return "Tested";
  return "Configured";
}

function parseCallbackUrls(text: string): string[] {
  // accepts newline or comma separated input
  const raw = (text ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stringifyCallbackUrls(urls?: string[] | null): string {
  if (!urls || urls.length === 0) return "";
  return urls.join("\n");
}

function deriveToggles(featureTogglesJson: any) {
  const t = featureTogglesJson ?? {};

  // allow multiple possible keys (backward compatible)
  const abhaLinking =
    Boolean(t.abhaLinking ?? t.linking ?? t.enableAbhaLinking ?? false) ||
    Boolean(t.abhaCreation ?? t.creation ?? false) ||
    Boolean(t.scanAndShare ?? t.scan_share ?? false);

  const consentFlow = Boolean(
    t.consentManagement ?? t.enableConsentFlow ?? t.consent_flow ?? false,
  );

  const healthRecords = Boolean(
    t.healthRecordSharing ?? t.enableHealthRecords ?? t.health_records ?? false,
  );

  return {
    enableAbhaLinking: abhaLinking,
    enableConsentFlow: consentFlow,
    enableHealthRecords: healthRecords,
  };
}

function buildFeatureTogglesJson(opts: {
  enableAbhaLinking: boolean;
  enableConsentFlow: boolean;
  enableHealthRecords: boolean;
}) {
  // matches your requirement doc: creation, linking, scan & share, consent management, health record sharing
  return {
    abhaCreation: opts.enableAbhaLinking,
    abhaLinking: opts.enableAbhaLinking,
    scanAndShare: opts.enableAbhaLinking,

    consentManagement: opts.enableConsentFlow,
    healthRecordSharing: opts.enableHealthRecords,
  };
}

/* --------------------------------- Page ---------------------------------- */

export default function AbhaConfigPage() {
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);

  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [configId, setConfigId] = React.useState<string | null>(null);
  const [activeEnv, setActiveEnv] = React.useState<AbdmEnvironment>("SANDBOX");

  // Form state
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState(""); // user enters NEW secret here
  const [secretAlreadySaved, setSecretAlreadySaved] = React.useState(false); // indicates config has a stored secret

  const [callbackUrlsText, setCallbackUrlsText] = React.useState(""); // textarea string; we convert to string[]
  const [enableAbhaLinking, setEnableAbhaLinking] = React.useState(false);
  const [enableConsentFlow, setEnableConsentFlow] = React.useState(false);
  const [enableHealthRecords, setEnableHealthRecords] = React.useState(false);

  const [status, setStatus] = React.useState<AbdmConfigApi["status"]>("NOT_CONFIGURED");

  const resetForm = React.useCallback(() => {
    setConfigId(null);
    setClientId("");
    setClientSecret("");
    setSecretAlreadySaved(false);

    setCallbackUrlsText("");
    setEnableAbhaLinking(false);
    setEnableConsentFlow(false);
    setEnableHealthRecords(false);
    setStatus("NOT_CONFIGURED");
  }, []);

  const fetchConfig = React.useCallback(
    async (wsId: string, env: AbdmEnvironment) => {
      setLoading(true);
      try {
        const config = await apiFetch<AbdmConfigApi | null>(
          `/api/compliance/abdm/config?workspaceId=${wsId}&environment=${env}`,
        );

        if (config && config.id) {
          setConfigId(config.id);

          setClientId(config.clientId ?? "");

          // IMPORTANT: never prefill secret; only mark it as present
          setSecretAlreadySaved(Boolean(config.clientSecretEnc));
          setClientSecret("");

          setCallbackUrlsText(stringifyCallbackUrls(config.callbackUrls ?? []));

          const derived = deriveToggles(config.featureTogglesJson);
          setEnableAbhaLinking(derived.enableAbhaLinking);
          setEnableConsentFlow(derived.enableConsentFlow);
          setEnableHealthRecords(derived.enableHealthRecords);

          setStatus(config.status ?? "NOT_CONFIGURED");
        } else {
          resetForm();
        }
      } catch {
        resetForm();
      } finally {
        setLoading(false);
      }
    },
    [resetForm],
  );

  React.useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);

    (async () => {
      try {
        const wsResp = await apiFetch<any>(
          `/api/compliance/workspaces?branchId=${activeBranchId}`,
        );

        const wsList: Workspace[] = Array.isArray(wsResp)
          ? wsResp
          : Array.isArray(wsResp?.items)
            ? wsResp.items
            : [];

        const ws = wsList?.[0];
        if (ws) {
          setWorkspaceId(ws.id);
          await fetchConfig(ws.id, activeEnv);
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
  }, [activeBranchId]); // intentionally not adding fetchConfig/activeEnv to avoid double calls

  React.useEffect(() => {
    if (!workspaceId) return;
    fetchConfig(workspaceId, activeEnv);
  }, [activeEnv, workspaceId, fetchConfig]);

  async function handleSave() {
    if (!workspaceId) return;

    if (!clientId.trim()) {
      toast({
        title: "Validation Error",
        description: "Client ID is required.",
        variant: "destructive",
      });
      return;
    }

    // Require secret on CREATE only, or if no stored secret exists yet
    if (!configId && !clientSecret.trim()) {
      toast({
        title: "Validation Error",
        description: "Client Secret is required for first-time configuration.",
        variant: "destructive",
      });
      return;
    }
    if (configId && !secretAlreadySaved && !clientSecret.trim()) {
      toast({
        title: "Validation Error",
        description: "Client Secret is required (no existing secret found).",
        variant: "destructive",
      });
      return;
    }

    const callbackUrls = parseCallbackUrls(callbackUrlsText);
    const featureTogglesJson = buildFeatureTogglesJson({
      enableAbhaLinking,
      enableConsentFlow,
      enableHealthRecords,
    });

    setSaving(true);
    try {
      const body: any = {
        workspaceId,
        environment: activeEnv,
        clientId: clientId.trim(),
        callbackUrls,
        featureTogglesJson,
      };

      // Only send secret when user entered a new one
      if (clientSecret.trim()) {
        body.clientSecretEnc = clientSecret.trim();
      }

      if (configId) {
        await apiFetch(`/api/compliance/abdm/config/${configId}`, {
          method: "PATCH",
          body,
        });
        toast({
          title: "Configuration Updated",
          description: "ABHA settings saved successfully.",
        });
      } else {
        const created = await apiFetch<AbdmConfigApi>(
          `/api/compliance/abdm/config`,
          { method: "POST", body },
        );
        setConfigId(created.id);
        toast({
          title: "Configuration Created",
          description: "ABHA settings saved successfully.",
        });
      }

      // After successful save, if secret was provided, it is now stored
      if (clientSecret.trim()) {
        setSecretAlreadySaved(true);
        setClientSecret("");
      }

      await fetchConfig(workspaceId, activeEnv);
    } catch (e: any) {
      toast({
        title: "Save Failed",
        description: e.message ?? "Failed to save configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!configId) {
      toast({
        title: "Cannot Test",
        description: "Save the configuration first before testing.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      await apiFetch(`/api/compliance/abdm/config/${configId}/test`, {
        method: "POST",
        body: {},
      });
      toast({
        title: "Connection Successful",
        description: "ABDM API connection test passed.",
      });
      setStatus("TESTED");
    } catch (e: any) {
      toast({
        title: "Connection Failed",
        description: e.message ?? "ABDM API connection test failed.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell title="ABHA Configuration">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/compliance/abdm">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-2xl border-zc-border"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30">
              <Shield className="h-5 w-5 text-zc-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">
                ABHA Configuration
              </div>
              <div className="mt-1 text-sm text-zc-muted">
                Configure ABDM API credentials and feature toggles for ABHA
                integration.
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

        {/* ── Guard states ───────────────────────────────────────────── */}
        {!activeBranchId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              Select a branch to configure ABHA.
            </CardContent>
          </Card>
        ) : !workspaceId && !loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-zc-muted">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
              No compliance workspace found for this branch. Create one in{" "}
              <Link
                href="/compliance/workspaces"
                className="text-zc-accent hover:underline"
              >
                Workspaces
              </Link>{" "}
              first.
            </CardContent>
          </Card>
        ) : (
          <Tabs
            value={activeEnv}
            onValueChange={(v) => setActiveEnv(v as AbdmEnvironment)}
          >
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
                  {/* ── API Credentials ──────────────────────────── */}
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        API Credentials
                      </CardTitle>
                      <CardDescription>
                        {activeEnv === "SANDBOX"
                          ? "Sandbox credentials for testing ABDM integration."
                          : "Production credentials for live ABDM integration. Handle with care."}
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="clientId">Client ID</Label>
                          <Input
                            id="clientId"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="Enter ABDM Client ID"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="clientSecret">Client Secret</Label>
                          <div className="relative">
                            <Input
                              id="clientSecret"
                              type={showSecret ? "text" : "password"}
                              value={clientSecret}
                              onChange={(e) => setClientSecret(e.target.value)}
                              placeholder={
                                secretAlreadySaved
                                  ? "•••••••• (leave blank to keep existing)"
                                  : "Enter ABDM Client Secret"
                              }
                              disabled={saving}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zc-muted hover:text-zc-text"
                            >
                              {showSecret ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="callbackUrls">Callback URLs</Label>
                        <Textarea
                          id="callbackUrls"
                          value={callbackUrlsText}
                          onChange={(e) => setCallbackUrlsText(e.target.value)}
                          placeholder="https://example.com/callback&#10;https://example.com/webhook"
                          rows={3}
                          disabled={saving}
                        />
                        <p className="text-xs text-zc-muted">
                          Enter one URL per line (or comma separated).
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Feature Toggles ──────────────────────────── */}
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Feature Toggles
                      </CardTitle>
                      <CardDescription>
                        Enable or disable specific ABDM features for this
                        environment.
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-4 pt-4">
                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zc-text">
                            ABHA Linking / Creation / Scan & Share
                          </p>
                          <p className="text-xs text-zc-muted">
                            Enable ABHA creation/linking + scan & share flows.
                          </p>
                        </div>
                        <Switch
                          checked={enableAbhaLinking}
                          onCheckedChange={setEnableAbhaLinking}
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zc-text">
                            Consent Management
                          </p>
                          <p className="text-xs text-zc-muted">
                            Enable ABDM consent flow for data exchange.
                          </p>
                        </div>
                        <Switch
                          checked={enableConsentFlow}
                          onCheckedChange={setEnableConsentFlow}
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-zc-border bg-zc-panel/20 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zc-text">
                            Health Record Sharing
                          </p>
                          <p className="text-xs text-zc-muted">
                            Enable push/pull of health records via HIE.
                          </p>
                        </div>
                        <Switch
                          checked={enableHealthRecords}
                          onCheckedChange={setEnableHealthRecords}
                          disabled={saving}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Actions ──────────────────────────────────── */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleTestConnection}
                      disabled={saving || testing || !configId}
                    >
                      {testing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Test Connection
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          if (workspaceId) fetchConfig(workspaceId, activeEnv);
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
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
