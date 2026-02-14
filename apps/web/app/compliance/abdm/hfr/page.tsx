"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RequirePerm } from "@/components/RequirePerm";
import { useBranchContext } from "@/lib/branch/useBranchContext";
import { CompliancePageHead, CompliancePageInsights } from "@/components/copilot/ComplianceHelpInline";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";

/* --------------------------------- Types --------------------------------- */

type VerificationStatus = "DRAFT" | "SUBMITTED" | "VERIFIED" | "REJECTED";

type HfrProfile = {
  id: string;
  workspaceId: string;
  hfrId?: string | null;
  verificationStatus: VerificationStatus;
  facilityName: string;
  ownershipType: string;
  facilityType: string;
  systemsOfMedicine: string[];
  servicesOffered: string[];
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type ValidationResult = {
  completenessScore: number;
  missingFields: string[];
  valid: boolean;
};

type Workspace = { id: string; name: string; branchId: string };

/* --------------------------------- Constants ----------------------------- */

const OWNERSHIP_TYPES = ["Government", "Private", "Public-Private Partnership", "Trust", "Society", "Corporate"];
const FACILITY_TYPES = ["Hospital", "Clinic", "Nursing Home", "Diagnostic Centre", "Pharmacy", "Blood Bank", "Primary Health Centre", "Community Health Centre", "Specialty Hospital", "Multi-Specialty Hospital"];
const SYSTEMS_OF_MEDICINE = ["Allopathy", "Ayurveda", "Homeopathy", "Unani", "Siddha", "Yoga & Naturopathy", "Sowa-Rigpa"];
const SERVICES_OFFERED = ["OPD", "IPD", "Emergency", "Surgery", "ICU", "Laboratory", "Radiology", "Pharmacy", "Blood Bank", "Dialysis", "Physiotherapy", "Dental", "Ophthalmology", "ENT", "Maternity", "Paediatrics", "Vaccination"];

/* --------------------------------- Helpers -------------------------------- */

function verificationBadgeClass(status: VerificationStatus) {
  const map: Record<VerificationStatus, string> = {
    DRAFT: "border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
    SUBMITTED: "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200",
    VERIFIED: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200",
    REJECTED: "border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
  };
  return map[status] ?? map.DRAFT;
}

function verificationLabel(status: VerificationStatus) {
  const map: Record<VerificationStatus, string> = { DRAFT: "Draft", SUBMITTED: "Submitted", VERIFIED: "Verified", REJECTED: "Rejected" };
  return map[status] ?? "Draft";
}

/* --------------------------------- Page ---------------------------------- */

export default function HfrProfilePage() {
  const router = useRouter();
  const { activeBranchId } = useBranchContext();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [profileId, setProfileId] = React.useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = React.useState<VerificationStatus>("DRAFT");
  const [hfrId, setHfrId] = React.useState<string | null>(null);

  const [facilityName, setFacilityName] = React.useState("");
  const [ownershipType, setOwnershipType] = React.useState("");
  const [facilityType, setFacilityType] = React.useState("");
  const [systemsOfMedicine, setSystemsOfMedicine] = React.useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = React.useState<string[]>([]);
  const [addressLine1, setAddressLine1] = React.useState("");
  const [addressLine2, setAddressLine2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);

  function resetForm() {
    setProfileId(null); setVerificationStatus("DRAFT"); setHfrId(null);
    setFacilityName(""); setOwnershipType(""); setFacilityType("");
    setSystemsOfMedicine([]); setServicesOffered([]);
    setAddressLine1(""); setAddressLine2(""); setCity(""); setState(""); setPincode("");
    setPhone(""); setEmail(""); setValidationResult(null);
  }

  function populateForm(profile: HfrProfile) {
    setProfileId(profile.id); setVerificationStatus(profile.verificationStatus);
    setHfrId(profile.hfrId ?? null); setFacilityName(profile.facilityName ?? "");
    setOwnershipType(profile.ownershipType ?? ""); setFacilityType(profile.facilityType ?? "");
    setSystemsOfMedicine(profile.systemsOfMedicine ?? []); setServicesOffered(profile.servicesOffered ?? []);
    setAddressLine1(profile.addressLine1 ?? ""); setAddressLine2(profile.addressLine2 ?? "");
    setCity(profile.city ?? ""); setState(profile.state ?? ""); setPincode(profile.pincode ?? "");
    setPhone(profile.phone ?? ""); setEmail(profile.email ?? "");
  }

  const fetchProfile = React.useCallback(async (wsId: string) => {
    setLoading(true);
    try {
      const profile = await apiFetch<HfrProfile | null>(`/api/compliance/abdm/hfr?workspaceId=${wsId}`);
      if (profile && profile.id) populateForm(profile); else resetForm();
    } catch { resetForm(); } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    (async () => {
      try {
        const data = await apiFetch<Workspace[] | { items: Workspace[] }>(`/api/compliance/workspaces?branchId=${activeBranchId}`);
        const workspaces = Array.isArray(data) ? data : (data?.items ?? []);
        const ws = workspaces[0];
        if (ws) { setWorkspaceId(ws.id); await fetchProfile(ws.id); }
        else { setWorkspaceId(null); resetForm(); setLoading(false); }
      } catch (e: any) { toast({ title: "Error", description: e.message ?? "Failed to load workspace", variant: "destructive" }); setLoading(false); }
    })();
  }, [activeBranchId]);

  function toggleCheckbox(value: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) {
    if (list.includes(value)) setter(list.filter((v) => v !== value)); else setter([...list, value]);
  }

  async function handleSave() {
    if (!workspaceId) return;
    if (!facilityName.trim()) { toast({ title: "Validation Error", description: "Facility Name is required.", variant: "destructive" }); return; }
    if (!ownershipType) { toast({ title: "Validation Error", description: "Ownership Type is required.", variant: "destructive" }); return; }
    if (!facilityType) { toast({ title: "Validation Error", description: "Facility Type is required.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = { workspaceId, facilityName: facilityName.trim(), ownershipType, facilityType, systemsOfMedicine, servicesOffered, addressLine1: addressLine1.trim(), addressLine2: addressLine2.trim(), city: city.trim(), state: state.trim(), pincode: pincode.trim(), phone: phone.trim(), email: email.trim() };
      if (profileId) { await apiFetch(`/api/compliance/abdm/hfr/${profileId}`, { method: "PATCH", body }); toast({ title: "Profile Updated", description: "HFR facility profile saved successfully." }); }
      else { const created = await apiFetch<HfrProfile>(`/api/compliance/abdm/hfr`, { method: "POST", body }); setProfileId(created.id); setVerificationStatus(created.verificationStatus ?? "DRAFT"); toast({ title: "Profile Created", description: "HFR facility profile saved successfully." }); }
      if (workspaceId) await fetchProfile(workspaceId);
    } catch (e: any) { toast({ title: "Save Failed", description: e.message ?? "Failed to save HFR profile.", variant: "destructive" }); } finally { setSaving(false); }
  }

  async function handleValidate() {
    if (!profileId) { toast({ title: "Cannot Validate", description: "Save the profile first before validating.", variant: "destructive" }); return; }
    setValidating(true);
    try {
      const result = await apiFetch<ValidationResult>(`/api/compliance/abdm/hfr/${profileId}/validate`, { method: "POST", body: {} });
      setValidationResult(result);
      if (result.valid) toast({ title: "Validation Passed", description: `Completeness score: ${result.completenessScore}%` });
      else toast({ title: "Validation Issues Found", description: `Completeness: ${result.completenessScore}%. ${result.missingFields.length} missing field(s).`, variant: "destructive" });
    } catch (e: any) { toast({ title: "Validation Failed", description: e.message ?? "Failed to validate HFR profile.", variant: "destructive" }); } finally { setValidating(false); }
  }

  return (
    <AppShell title="HFR Facility Profile">
      <RequirePerm perm="COMPLIANCE_ABDM_HFR_UPDATE">
      <div className="grid gap-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/compliance/abdm")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zc-border bg-zc-panel/30"><Building2 className="h-5 w-5 text-zc-accent" /></span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight">HFR Facility Profile</div>
              <div className="mt-1 text-sm text-zc-muted">Register and manage your facility profile on the Health Facility Registry.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePageHead pageId="compliance-abdm-hfr" />
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", verificationBadgeClass(verificationStatus))}>{verificationLabel(verificationStatus)}</span>
            {hfrId && (<span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50/70 px-2 py-0.5 text-[11px] font-mono font-semibold text-gray-700 dark:border-gray-900/40 dark:bg-gray-900/20 dark:text-gray-200">HFR: {hfrId}</span>)}
          </div>
        </div>

        {/* AI Insights */}
        <CompliancePageInsights pageId="compliance-abdm-hfr" />

        {/* ── Guard states ───────────────────────────────────────────── */}
        {!activeBranchId ? (
          <Card><CardContent className="py-10 text-center text-sm text-zc-muted"><AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />Select a branch to manage HFR profile.</CardContent></Card>
        ) : !workspaceId && !loading ? (
          <Card><CardContent className="py-10 text-center text-sm text-zc-muted"><AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />No compliance workspace found for this branch. Create one in{" "}<Link href="/compliance/workspaces" className="text-zc-accent hover:underline">Workspaces</Link>{" "}first.</CardContent></Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zc-muted" /></div>
        ) : (
          <>
            {/* ── Validation Results ───────────────────────────────── */}
            {validationResult && (
              <div className={cn("flex items-start gap-3 rounded-xl border p-4", validationResult.valid ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-900/10" : "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10")}>
                {validationResult.valid ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />}
                <div>
                  <p className="text-sm font-medium">Completeness Score: <span className="text-lg font-bold">{validationResult.completenessScore}%</span></p>
                  {validationResult.missingFields.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-zc-muted mb-1">Missing fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {validationResult.missingFields.map((field) => (<span key={field} className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">{field}</span>))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Basic Info ──────────────────────────────────────── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Basic Information</CardTitle><CardDescription>Core details about the healthcare facility.</CardDescription></CardHeader>
              <Separator />
              <CardContent className="pt-4 grid gap-4">
                <div className="grid gap-2"><Label htmlFor="facilityName">Facility Name *</Label><Input id="facilityName" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="Enter facility name" disabled={saving} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2"><Label>Ownership Type *</Label><Select value={ownershipType} onValueChange={setOwnershipType} disabled={saving}><SelectTrigger><SelectValue placeholder="Select ownership type" /></SelectTrigger><SelectContent>{OWNERSHIP_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label>Facility Type *</Label><Select value={facilityType} onValueChange={setFacilityType} disabled={saving}><SelectTrigger><SelectValue placeholder="Select facility type" /></SelectTrigger><SelectContent>{FACILITY_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
                </div>
              </CardContent>
            </Card>

            {/* ── Services ────────────────────────────────────────── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Services</CardTitle><CardDescription>Systems of medicine practiced and services offered at this facility.</CardDescription></CardHeader>
              <Separator />
              <CardContent className="pt-4 grid gap-6">
                <div className="grid gap-3">
                  <Label>Systems of Medicine</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {SYSTEMS_OF_MEDICINE.map((s) => (<div key={s} className="flex items-center gap-2"><Checkbox id={`som-${s}`} checked={systemsOfMedicine.includes(s)} onCheckedChange={() => toggleCheckbox(s, systemsOfMedicine, setSystemsOfMedicine)} disabled={saving} /><Label htmlFor={`som-${s}`} className="text-sm font-normal cursor-pointer">{s}</Label></div>))}
                  </div>
                </div>
                <Separator />
                <div className="grid gap-3">
                  <Label>Services Offered</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {SERVICES_OFFERED.map((s) => (<div key={s} className="flex items-center gap-2"><Checkbox id={`svc-${s}`} checked={servicesOffered.includes(s)} onCheckedChange={() => toggleCheckbox(s, servicesOffered, setServicesOffered)} disabled={saving} /><Label htmlFor={`svc-${s}`} className="text-sm font-normal cursor-pointer">{s}</Label></div>))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Address ─────────────────────────────────────────── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3"><CardTitle className="text-base">Address</CardTitle><CardDescription>Physical location of the healthcare facility.</CardDescription></CardHeader>
              <Separator />
              <CardContent className="pt-4 grid gap-4">
                <div className="grid gap-2"><Label htmlFor="addressLine1">Address Line 1</Label><Input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street address, building name" disabled={saving} /></div>
                <div className="grid gap-2"><Label htmlFor="addressLine2">Address Line 2</Label><Input id="addressLine2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Area, locality" disabled={saving} /></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2"><Label htmlFor="city">City</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" disabled={saving} /></div>
                  <div className="grid gap-2"><Label htmlFor="state">State</Label><Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" disabled={saving} /></div>
                  <div className="grid gap-2"><Label htmlFor="pincode">Pincode</Label><Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="6-digit pincode" maxLength={6} disabled={saving} /></div>
                </div>
              </CardContent>
            </Card>

            {/* ── Contact ─────────────────────────────────────────── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle><CardDescription>Primary contact details for the facility.</CardDescription></CardHeader>
              <Separator />
              <CardContent className="pt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" disabled={saving} /></div>
                  <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="facility@example.com" disabled={saving} /></div>
                </div>
              </CardContent>
            </Card>

            {/* ── Actions ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <Button variant="outline" className="px-5 gap-2" onClick={handleValidate} disabled={saving || validating || !profileId}>
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                Validate Profile
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="px-5 gap-2" onClick={() => { if (workspaceId) fetchProfile(workspaceId); }} disabled={saving || validating}><RefreshCw className="h-4 w-4" />Reset</Button>
                <Button variant="primary" className="px-5 gap-2" onClick={handleSave} disabled={saving || validating}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Profile</Button>
              </div>
            </div>
          </>
        )}
      </div>
      </RequirePerm>
    </AppShell>
  );
}
