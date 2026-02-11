"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OnboardingShell } from "../_components/OnboardingShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth/store";

type IdentityDocType = "AADHAAR" | "PAN" | "PASSPORT" | "DRIVING_LICENSE" | "VOTER_ID" | "OTHER";
type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

type IdentityDocumentDraft = {
  id: string;
  doc_type: IdentityDocType;
  doc_number: string;

  name_on_document?: string;
  issuing_authority?: string;

  issued_on?: string; // YYYY-MM-DD
  valid_to?: string; // YYYY-MM-DD

  is_primary: boolean;

  verification_status: VerificationStatus;
  verification_notes?: string;

  evidence_urls?: string[]; // server URLs, generated automatically after upload
};

type PhotoDraft = {
  photo_url?: string | null;
  signature_url?: string | null;
  stamp_url?: string | null;
  notes?: string | null;
};

type StaffOnboardingDraft = {
  personal_details?: Record<string, any>;
  contact_details?: Record<string, any>;
  employment_details?: Record<string, any>;
  medical_details?: Record<string, any>;
  system_access?: Record<string, any>;
  assignments?: any[];
};

type FieldErrorMap = Record<string, string>;

type UploadResp = {
  url: string;
  key?: string;
  mime?: string;
  sizeBytes?: number;
  checksumSha256?: string;
};

type PreviewState = {
  photoObjUrl: string | null;
  signatureObjUrl: string | null;
};

const BASE = "/infrastructure/human-resource/staff/onboarding";

const DOC_LABEL: Record<IdentityDocType, string> = {
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
  OTHER: "Other",
};

const DOC_HELP: Record<IdentityDocType, string> = {
  AADHAAR: "Upload front + back (optional). Number = 12 digits.",
  PAN: "Upload scan (optional). PAN = ABCDE1234F.",
  PASSPORT: "Upload scan (optional).",
  DRIVING_LICENSE: "Upload scan (optional).",
  VOTER_ID: "Upload scan (optional).",
  OTHER: "Upload scan (optional).",
};

export default function IdentityPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draftId");

  // ✅ Zustand token fallback (some flows might not have localStorage access_token populated)
  const storeToken = useAuthStore((s) => s.token);

  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrorMap>({});

  const [consent, setConsent] = React.useState(false);
  const [docs, setDocs] = React.useState<IdentityDocumentDraft[]>([]);

  const [photo, setPhoto] = React.useState<PhotoDraft>({
    photo_url: "",
    signature_url: "",
    stamp_url: "",
    notes: "",
  });

  const [preview, setPreview] = React.useState<PreviewState>({
    photoObjUrl: null,
    signatureObjUrl: null,
  });

  const [uploading, setUploading] = React.useState<{
    photo: boolean;
    sign: boolean;
    doc: Record<string, boolean>; // docId -> uploading
  }>({ photo: false, sign: false, doc: {} });

  function getBearerToken(): string | null {
    try {
      if (typeof window !== "undefined") {
        const t = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
        if (t) return t;
      }
    } catch {}
    return storeToken ?? null;
  }

  function revokeObjUrl(u: string | null) {
    if (!u) return;
    try {
      URL.revokeObjectURL(u);
    } catch {}
  }

  async function fetchAsObjectUrl(url: string): Promise<string> {
    const token = getBearerToken();
    if (!token) throw new Error("Session expired. Please login again.");

    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!res.ok) {
      // try to read JSON error
      let msg = `Request failed (${res.status})`;
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => null);
          msg = j?.message || j?.error || msg;
        } else {
          const t = await res.text().catch(() => "");
          if (t) msg = t;
        }
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function openSecure(url: string) {
    try {
      const obj = await fetchAsObjectUrl(url);
      window.open(obj, "_blank", "noopener,noreferrer");
      // keep alive briefly so the new tab can load it
      window.setTimeout(() => revokeObjUrl(obj), 60_000);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Open failed",
        description: err?.message ?? "Could not open file.",
      });
    }
  }

  // ✅ load previews when URLs exist (because <img src> cannot send Bearer)
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      const photoUrl = String(photo.photo_url || "").trim();
      if (!photoUrl) {
        setPreview((p) => {
          if (p.photoObjUrl) revokeObjUrl(p.photoObjUrl);
          return { ...p, photoObjUrl: null };
        });
        return;
      }

      try {
        const obj = await fetchAsObjectUrl(photoUrl);
        if (cancelled) {
          revokeObjUrl(obj);
          return;
        }
        setPreview((p) => {
          if (p.photoObjUrl && p.photoObjUrl !== obj) revokeObjUrl(p.photoObjUrl);
          return { ...p, photoObjUrl: obj };
        });
      } catch {
        // keep silent; preview will show "No photo uploaded" style block
        setPreview((p) => {
          if (p.photoObjUrl) revokeObjUrl(p.photoObjUrl);
          return { ...p, photoObjUrl: null };
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.photo_url]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      const signUrl = String(photo.signature_url || "").trim();
      if (!signUrl) {
        setPreview((p) => {
          if (p.signatureObjUrl) revokeObjUrl(p.signatureObjUrl);
          return { ...p, signatureObjUrl: null };
        });
        return;
      }

      try {
        const obj = await fetchAsObjectUrl(signUrl);
        if (cancelled) {
          revokeObjUrl(obj);
          return;
        }
        setPreview((p) => {
          if (p.signatureObjUrl && p.signatureObjUrl !== obj) revokeObjUrl(p.signatureObjUrl);
          return { ...p, signatureObjUrl: obj };
        });
      } catch {
        setPreview((p) => {
          if (p.signatureObjUrl) revokeObjUrl(p.signatureObjUrl);
          return { ...p, signatureObjUrl: null };
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.signature_url]);

  React.useEffect(() => {
    return () => {
      // cleanup previews on unmount
      setPreview((p) => {
        revokeObjUrl(p.photoObjUrl);
        revokeObjUrl(p.signatureObjUrl);
        return { photoObjUrl: null, signatureObjUrl: null };
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const draft = readDraft(draftId);
      const pd: any = draft.personal_details ?? {};

      const raw = pd.identity_documents;
      const parsed: IdentityDocumentDraft[] = Array.isArray(raw)
        ? raw
            .filter((x: any) => x && typeof x === "object")
            .map((x: any) => ({
              id: String(x.id || makeId()),
              doc_type: (String(x.doc_type || "AADHAAR").toUpperCase() as IdentityDocType) || "AADHAAR",
              doc_number: String(x.doc_number || "").trim(),
              name_on_document: x.name_on_document ? String(x.name_on_document).trim() : undefined,
              issuing_authority: x.issuing_authority ? String(x.issuing_authority).trim() : undefined,
              issued_on: x.issued_on ? String(x.issued_on).slice(0, 10) : undefined,
              valid_to: x.valid_to ? String(x.valid_to).slice(0, 10) : undefined,
              is_primary: !!x.is_primary,
              verification_status:
                (String(x.verification_status || "PENDING").toUpperCase() as VerificationStatus) || "PENDING",
              verification_notes: x.verification_notes ? String(x.verification_notes) : undefined,
              evidence_urls: Array.isArray(x.evidence_urls)
                ? x.evidence_urls.map((u: any) => String(u).trim()).filter(Boolean)
                : [],
            }))
        : [];

      setDocs(normalizePrimary(parsed));
      setConsent(!!pd.identity_consent_acknowledged);

      const pb = (pd.photo_biometric ?? {}) as any;
      setPhoto({
        photo_url: pb.photo_url ?? "",
        signature_url: pb.signature_url ?? "",
        stamp_url: pb.stamp_url ?? "",
        notes: pb.notes ?? "",
      });

      setDirty(false);
      setErrors({});
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  function setDocAt(idx: number, next: IdentityDocumentDraft) {
    setDocs((prev) => {
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
    setDirty(true);
  }

  function addDoc() {
    setDocs((prev) =>
      normalizePrimary([
        ...prev,
        {
          id: makeId(),
          doc_type: "AADHAAR",
          doc_number: "",
          name_on_document: "",
          issuing_authority: "",
          issued_on: "",
          valid_to: "",
          is_primary: prev.length === 0,
          verification_status: "PENDING",
          verification_notes: "",
          evidence_urls: [],
        },
      ]),
    );
    setDirty(true);
  }

  function removeDoc(id: string) {
    setDocs((prev) => normalizePrimary(prev.filter((d) => d.id !== id)));
    setDirty(true);
  }

  function markPrimary(id: string) {
    setDocs((prev) => normalizePrimary(prev.map((d) => ({ ...d, is_primary: d.id === id }))));
    setDirty(true);
  }

  function updatePhoto<K extends keyof PhotoDraft>(k: K, v: PhotoDraft[K]) {
    setPhoto((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  function addEvidenceToDoc(docId: string, url: string) {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const current = Array.isArray(d.evidence_urls) ? d.evidence_urls : [];
        if (current.includes(url)) return d;
        return { ...d, evidence_urls: [...current, url] };
      }),
    );
    setDirty(true);
  }

  function removeEvidenceFromDoc(docId: string, url: string) {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const current = Array.isArray(d.evidence_urls) ? d.evidence_urls : [];
        return { ...d, evidence_urls: current.filter((x) => x !== url) };
      }),
    );
    setDirty(true);
  }

  async function uploadStaffAsset(kind: "PROFILE_PHOTO" | "SIGNATURE" | "IDENTITY_DOC", file: File): Promise<string> {
    if (!draftId) throw new Error("draftId missing");

    const token = getBearerToken();
    if (!token) throw new Error("Session expired. Please login again.");

    const max = 5 * 1024 * 1024;
    const mime = (file.type || "").toLowerCase();

    // ✅ Allow PDF only for ID document scans (Aadhaar/PAN etc.)
    const allowPdf = kind === "IDENTITY_DOC";
    const allowedMimes = allowPdf
      ? ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
      : ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedMimes.includes(mime)) {
      throw new Error(allowPdf ? "Only JPG/PNG/WEBP/PDF files are allowed." : "Only JPG/PNG/WEBP images are allowed.");
    }
    if (file.size > max) throw new Error("Max file size is 5MB.");

    const fd = new FormData();
    fd.append("contextId", draftId);
    fd.append("kind", kind);
    fd.append("file", file);

    // ✅ Force Authorization header (works even if token is only in Zustand)
    const res = await apiFetch<UploadResp>("/api/infrastructure/files/upload", {
      method: "POST",
      body: fd,
      showLoader: false,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res?.url) throw new Error("Upload failed: server did not return URL.");
    return res.url;
  }

  function validate(): FieldErrorMap {
    const e: FieldErrorMap = {};

    if (docs.length === 0) {
      e["docs"] = "Add at least one identity document.";
      return e;
    }

    const primaryCount = docs.filter((d) => d.is_primary).length;
    if (primaryCount !== 1) e["docs.primary"] = "Exactly one document must be marked as Primary.";

    docs.forEach((d, idx) => {
      const type = d.doc_type;
      const num = String(d.doc_number || "").trim();

      if (!type) e[`docs.${idx}.doc_type`] = "Document type is required.";
      if (!num) e[`docs.${idx}.doc_number`] = "Document number is required.";
      else {
        const msg = validateDocNumber(type, num);
        if (msg) e[`docs.${idx}.doc_number`] = msg;
      }

      const issued = String(d.issued_on || "").trim();
      const validTo = String(d.valid_to || "").trim();
      if (issued && !isISODate(issued)) e[`docs.${idx}.issued_on`] = "Use YYYY-MM-DD format.";
      if (validTo && !isISODate(validTo)) e[`docs.${idx}.valid_to`] = "Use YYYY-MM-DD format.";
      if (issued && validTo && issued > validTo) e[`docs.${idx}.valid_to`] = "Valid-to cannot be before issued-on.";

      const status = d.verification_status;
      if (!status) e[`docs.${idx}.verification_status`] = "Verification status is required.";
      if (status === "REJECTED" && !String(d.verification_notes || "").trim()) {
        e[`docs.${idx}.verification_notes`] = "Rejection notes are required when status is REJECTED.";
      }
    });

    if (!consent) e["consent"] = "Consent acknowledgement is required.";
    return e;
  }

  function saveDraftOrThrow() {
    if (!draftId) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast({
        variant: "destructive",
        title: "Fix required fields",
        description: "Please fix the highlighted items to continue.",
      });
      throw new Error("validation_failed");
    }

    const existing = readDraft(draftId);
    const pd: any = existing.personal_details ?? {};

    const normalizedDocs = normalizePrimary(
      docs.map((d) => ({
        ...d,
        doc_number: normalizeDocNumber(d.doc_type, d.doc_number),
        name_on_document: cleanOpt(d.name_on_document),
        issuing_authority: cleanOpt(d.issuing_authority),
        issued_on: cleanDateOpt(d.issued_on),
        valid_to: cleanDateOpt(d.valid_to),
        verification_notes: cleanOpt(d.verification_notes),
        evidence_urls: Array.isArray(d.evidence_urls) ? d.evidence_urls.map((u) => String(u).trim()).filter(Boolean) : [],
      })),
    );

    const nextPhotoBlock = {
      photo_url: String(photo.photo_url || "").trim() || null,
      signature_url: String(photo.signature_url || "").trim() || null,
      stamp_url: String(photo.stamp_url || "").trim() || null,

      biometric_enrolled: false,
      biometric_enrollment_id: null,
      biometric_device_id: null,
      enrolled_at: null,
      attendance_id: null,

      notes: String(photo.notes || "").trim() || null,
    };

    const nextDraft: StaffOnboardingDraft = {
      ...existing,
      personal_details: {
        ...pd,
        identity_consent_acknowledged: true,
        identity_documents: normalizedDocs,
        photo_biometric: nextPhotoBlock,
      },
    };

    writeDraft(draftId, nextDraft);
    setDirty(false);
    toast({ title: "Saved", description: "Identity + uploads saved to draft." });
  }

  function onSave() {
    try {
      saveDraftOrThrow();
    } catch {}
  }

  function onSaveAndNext() {
    try {
      saveDraftOrThrow();
      router.push(withDraftId(`${BASE}/employment`, draftId) as any);
    } catch {}
  }

  return (
    <OnboardingShell
      stepKey="identity"
      title="Identity details"
      description="Capture KYC + upload photo/signature + upload Aadhaar/PAN scans."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="border-zc-border"
            onClick={() => router.push(withDraftId(`${BASE}/personal`, draftId) as any)}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zc-border" onClick={onSave} disabled={loading}>
              Save
            </Button>
            <Button className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={onSaveAndNext} disabled={loading}>
              Save &amp; Next
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top summary */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zc-foreground">Identity + uploads</div>
            <div className="mt-1 text-xs text-zc-muted">
              Upload photo/signature using the buttons. For Aadhaar/PAN, upload scans inside the document card.
            </div>
            {errors["docs"] ? (
              <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
                {errors["docs"]}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="border border-zc-border">
              Documents: {docs.length}
            </Badge>

            {dirty ? (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="secondary">
                Unsaved changes
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                Saved
              </Badge>
            )}
          </div>
        </div>

        <Separator className="bg-zc-border" />

        {/* Consent */}
        <div className="rounded-md border border-zc-border bg-zc-card/40 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zc-foreground">Consent acknowledgement</div>
              <div className="mt-1 text-xs text-zc-muted">Confirm staff consent for storing/processing identity information.</div>
              {errors["consent"] ? <div className="mt-2 text-xs text-red-500">{errors["consent"]}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zc-muted">Acknowledged</Label>
              <Switch
                checked={consent}
                onCheckedChange={(v) => {
                  setConsent(v);
                  setDirty(true);
                  setErrors((e) => {
                    const next = { ...e };
                    delete next["consent"];
                    return next;
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Uploads (fixed UI: no default file input) */}
        <Card className={cn("border-zc-border bg-zc-card", loading ? "opacity-60" : "opacity-100")}>
          <CardHeader>
            <CardTitle className="text-sm">Profile photo & signature upload</CardTitle>
            <CardDescription>Use the Upload buttons (no browser “Choose File” UI).</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            {/* Profile Photo */}
            <div className="grid gap-2">
              <Label className="text-xs text-zc-muted">Profile photo</Label>

              {photo.photo_url ? (
                <div className="rounded-md border border-zc-border bg-zc-card/40 p-2">
                  {/* ✅ use object URL preview so Bearer is not required by <img> */}
                  {preview.photoObjUrl ? (
                    <img src={preview.photoObjUrl} alt="Profile" className="h-28 w-28 rounded-md object-cover" />
                  ) : (
                    <div className="h-28 w-28 rounded-md border border-zc-border bg-zc-card/40" />
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="warning" className="h-8 border-zc-border" onClick={() => updatePhoto("photo_url", "")}>
                      Remove
                    </Button>
                    <button
                      type="button"
                      onClick={() => openSecure(String(photo.photo_url))}
                      className="text-xs text-zc-accent underline underline-offset-2"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-zc-border bg-zc-card/40 p-3 text-xs text-zc-muted">No photo uploaded.</div>
              )}

              <UploadButton
                label={uploading.photo ? "Uploading…" : "Upload photo"}
                
                disabled={!draftId || uploading.photo}
                onPick={async (file) => {
                  try {
                    setUploading((p) => ({ ...p, photo: true }));
                    const url = await uploadStaffAsset("PROFILE_PHOTO", file);
                    updatePhoto("photo_url", url);
                    toast({ title: "Uploaded", description: "Profile photo uploaded successfully." });
                  } catch (err: any) {
                    toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Could not upload photo." });
                  } finally {
                    setUploading((p) => ({ ...p, photo: false }));
                  }
                }}
              />
            </div>

            {/* Signature */}
            <div className="grid gap-2">
              <Label className="text-xs text-zc-muted">Signature</Label>

              {photo.signature_url ? (
                <div className="rounded-md border border-zc-border bg-zc-card/40 p-2">
                  {preview.signatureObjUrl ? (
                    <img
                      src={preview.signatureObjUrl}
                      alt="Signature"
                      className="h-28 w-full max-w-[320px] rounded-md object-contain bg-white"
                    />
                  ) : (
                    <div className="h-28 w-full max-w-[320px] rounded-md border border-zc-border bg-white" />
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="warning" className="h-8 border-zc-border" onClick={() => updatePhoto("signature_url", "")}>
                      Remove
                    </Button>
                    <button
                      type="button"
                      onClick={() => openSecure(String(photo.signature_url))}
                      className="text-xs text-zc-accent underline underline-offset-2"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-zc-border bg-zc-card/40 p-3 text-xs text-zc-muted">No signature uploaded.</div>
              )}

              <UploadButton
                label={uploading.sign ? "Uploading…" : "Upload signature"}
                disabled={!draftId || uploading.sign}
                onPick={async (file) => {
                  try {
                    setUploading((p) => ({ ...p, sign: true }));
                    const url = await uploadStaffAsset("SIGNATURE", file);
                    updatePhoto("signature_url", url);
                    toast({ title: "Uploaded", description: "Signature uploaded successfully." });
                  } catch (err: any) {
                    toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Could not upload signature." });
                  } finally {
                    setUploading((p) => ({ ...p, sign: false }));
                  }
                }}
              />
            </div>

            <div className="md:col-span-2 grid gap-2">
              <Label className="text-xs text-zc-muted">Notes (optional)</Label>
              <Textarea
                className="border-zc-border"
                value={String(photo.notes ?? "")}
                onChange={(e) => updatePhoto("notes", e.target.value)}
                placeholder="Any notes about capture…"
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-zc-muted">Identity documents</div>
            <Button type="button" className="bg-zc-accent text-white hover:bg-zc-accent/90" onClick={addDoc} disabled={loading}>
              Add document
            </Button>
          </div>

          {errors["docs.primary"] ? <div className="text-xs text-red-500">{errors["docs.primary"]}</div> : null}

          {docs.length === 0 ? (
            <div className="rounded-md border border-zc-border bg-zc-card/40 p-3 text-sm text-zc-muted">
              No identity documents added yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {docs.map((d, idx) => {
                const isPrimary = d.is_primary;
                const typeLabel = DOC_LABEL[d.doc_type] ?? d.doc_type;
                const help = DOC_HELP[d.doc_type] ?? "";

                const numErr = errors[`docs.${idx}.doc_number`];
                const issuedErr = errors[`docs.${idx}.issued_on`];
                const validToErr = errors[`docs.${idx}.valid_to`];
                const notesErr = errors[`docs.${idx}.verification_notes`];

                const docUploading = !!uploading.doc[d.id];
                const evidences = Array.isArray(d.evidence_urls) ? d.evidence_urls : [];

                return (
                  <div key={d.id} className="rounded-md border border-zc-border bg-zc-card/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="border border-zc-border">
                            {typeLabel}
                          </Badge>

                          {isPrimary ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="secondary">
                              Primary
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="border border-zc-border">
                              Secondary
                            </Badge>
                          )}

                          <Badge
                            variant="secondary"
                            className={cn(
                              "border border-zc-border",
                              d.verification_status === "VERIFIED"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : d.verification_status === "REJECTED"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {d.verification_status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-zc-muted">{help}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isPrimary ? (
                          <Button type="button" variant="outline" className="h-8 border-zc-border px-3 text-xs" onClick={() => markPrimary(d.id)}>
                            Make primary
                          </Button>
                        ) : null}
                        <Button type="button" variant="warning" className="h-8 border-zc-border px-3 text-xs" onClick={() => removeDoc(d.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>

                    {/* ✅ Upload Aadhaar/PAN scan */}
                    <div className="mt-3 rounded-md border border-zc-border bg-zc-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-medium text-zc-foreground">Upload document scan</div>
                        <UploadButton
                          label={docUploading ? "Uploading…" : "Upload scan"}
                          disabled={!draftId || docUploading}
                          accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
                          hint="JPG / PNG / WEBP / PDF - max 5MB"
                          onPick={async (file) => {
                            try {
                              setUploading((p) => ({ ...p, doc: { ...p.doc, [d.id]: true } }));
                              const url = await uploadStaffAsset("IDENTITY_DOC", file);
                              addEvidenceToDoc(d.id, url);
                              toast({ title: "Uploaded", description: "Document scan uploaded successfully." });
                            } catch (err: any) {
                              toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Could not upload document scan." });
                            } finally {
                              setUploading((p) => ({ ...p, doc: { ...p.doc, [d.id]: false } }));
                            }
                          }}
                        />
                      </div>

                      {evidences.length ? (
                        <div className="mt-3 grid gap-2">
                          {evidences.map((url) => (
                            <div key={url} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zc-border bg-zc-card/40 px-3 py-2">
                              <div className="min-w-0 text-xs text-zc-muted truncate">{url}</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openSecure(url)}
                                  className="text-xs text-zc-accent underline underline-offset-2"
                                >
                                  Open
                                </button>
                                <Button
                                  type="button"
                                  variant="warning"
                                  className="h-7 border-zc-border px-2 text-xs"
                                  onClick={() => removeEvidenceFromDoc(d.id, url)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-zc-muted">No scans uploaded yet (optional).</div>
                      )}
                    </div>

                    {/* Document fields */}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Document type" required error={errors[`docs.${idx}.doc_type`]}>
                        <Select
                          value={d.doc_type}
                          onValueChange={(v) => {
                            const doc_type = (String(v).toUpperCase() as IdentityDocType) || "OTHER";
                            setDocAt(idx, { ...d, doc_type });
                            setErrors((e) => {
                              const next = { ...e };
                              delete next[`docs.${idx}.doc_type`];
                              delete next[`docs.${idx}.doc_number`];
                              return next;
                            });
                          }}
                        >
                          <SelectTrigger className={cn("border-zc-border", errors[`docs.${idx}.doc_type`] ? "border-red-500" : "")}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AADHAAR">Aadhaar</SelectItem>
                            <SelectItem value="PAN">PAN</SelectItem>
                            <SelectItem value="PASSPORT">Passport</SelectItem>
                            <SelectItem value="DRIVING_LICENSE">Driving License</SelectItem>
                            <SelectItem value="VOTER_ID">Voter ID</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Document number" required error={numErr}>
                        <Input
                          className={cn("border-zc-border", numErr ? "border-red-500" : "")}
                          value={d.doc_number ?? ""}
                          onChange={(e) => {
                            setDocAt(idx, { ...d, doc_number: e.target.value });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.doc_number`];
                              return next;
                            });
                          }}
                          placeholder={d.doc_type === "PAN" ? "ABCDE1234F" : d.doc_type === "AADHAAR" ? "123412341234" : "Enter document number"}
                        />
                      </Field>

                      <Field label="Name on document">
                        <Input className="border-zc-border" value={d.name_on_document ?? ""} onChange={(e) => setDocAt(idx, { ...d, name_on_document: e.target.value })} placeholder="Optional" />
                      </Field>

                      <Field label="Issuing authority">
                        <Input className="border-zc-border" value={d.issuing_authority ?? ""} onChange={(e) => setDocAt(idx, { ...d, issuing_authority: e.target.value })} placeholder="Optional" />
                      </Field>

                      <Field label="Issued on" error={issuedErr} help="YYYY-MM-DD">
                        <Input
                          className={cn("border-zc-border", issuedErr ? "border-red-500" : "")}
                          value={d.issued_on ?? ""}
                          onChange={(e) => {
                            setDocAt(idx, { ...d, issued_on: e.target.value });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.issued_on`];
                              return next;
                            });
                          }}
                          placeholder="YYYY-MM-DD"
                        />
                      </Field>

                      <Field label="Valid to" error={validToErr} help="YYYY-MM-DD">
                        <Input
                          className={cn("border-zc-border", validToErr ? "border-red-500" : "")}
                          value={d.valid_to ?? ""}
                          onChange={(e) => {
                            setDocAt(idx, { ...d, valid_to: e.target.value });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.valid_to`];
                              return next;
                            });
                          }}
                          placeholder="YYYY-MM-DD"
                        />
                      </Field>

                      <Field label="Verification status" required error={errors[`docs.${idx}.verification_status`]}>
                        <Select
                          value={d.verification_status}
                          onValueChange={(v) => {
                            const verification_status = (String(v).toUpperCase() as VerificationStatus) || "PENDING";
                            setDocAt(idx, { ...d, verification_status });
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[`docs.${idx}.verification_status`];
                              return next;
                            });
                          }}
                        >
                          <SelectTrigger className={cn("border-zc-border", errors[`docs.${idx}.verification_status`] ? "border-red-500" : "")}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="VERIFIED">VERIFIED</SelectItem>
                            <SelectItem value="REJECTED">REJECTED</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Verification notes" error={notesErr} help={d.verification_status === "REJECTED" ? "Required when rejected" : "Optional"}>
                        <Textarea
                          className={cn("border-zc-border", notesErr ? "border-red-500" : "")}
                          value={d.verification_notes ?? ""}
                          onChange={(e) => setDocAt(idx, { ...d, verification_notes: e.target.value })}
                          placeholder={d.verification_status === "REJECTED" ? "Reason for rejection" : "Optional"}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-zc-muted">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
        {help ? <span className="text-[10px] text-zc-muted">{help}</span> : null}
      </div>
      {children}
      {error ? <div className="text-xs text-red-500">{error}</div> : null}
    </div>
  );
}

function UploadButton({
  label,
  disabled,
  accept,
  hint,
  onPick,
}: {
  label: string;
  disabled?: boolean;
  accept?: string;
  hint?: string;
  onPick: (file: File) => Promise<void> | void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept ?? "image/png,image/jpeg,image/webp"}
        onChange={async (e) => {
          const f = e.currentTarget.files?.[0];
          if (!f) return;
          try {
            await onPick(f);
          } finally {
            e.currentTarget.value = "";
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-8 border-zc-border"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      <span className="text-xs text-zc-muted">{hint ?? "JPG / PNG / WEBP · max 5MB"}</span>
    </div>
  );
}

/* ---------------- draft storage ---------------- */

function withDraftId(href: string, draftId: string | null): string {
  if (!draftId) return href;
  const u = new URL(href, "http://local");
  u.searchParams.set("draftId", draftId);
  return u.pathname + "?" + u.searchParams.toString();
}

function storageKey(draftId: string) {
  return `hrStaffOnboardingDraft:${draftId}`;
}

function readDraft(draftId: string): StaffOnboardingDraft {
  try {
    const raw = localStorage.getItem(storageKey(draftId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StaffOnboardingDraft;
  } catch {
    return {};
  }
}

function writeDraft(draftId: string, draft: StaffOnboardingDraft) {
  try {
    localStorage.setItem(storageKey(draftId), JSON.stringify(draft));
  } catch {}
}

/* ---------------- identity helpers ---------------- */

function normalizePrimary(list: IdentityDocumentDraft[]): IdentityDocumentDraft[] {
  if (!list.length) return list;
  const primaryCount = list.filter((d) => d.is_primary).length;
  if (primaryCount === 1) return list;
  const firstId = list[0].id;
  return list.map((d) => ({ ...d, is_primary: d.id === firstId }));
}

function validateDocNumber(type: IdentityDocType, raw: string): string | null {
  const v = normalizeDocNumber(type, raw);

  if (type === "AADHAAR" && !/^\d{12}$/.test(v)) return "Aadhaar must be exactly 12 digits.";
  if (type === "PAN" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v)) return "PAN must match pattern ABCDE1234F.";

  if (type === "PASSPORT") {
    if (v.length < 6 || v.length > 12) return "Passport number looks invalid (length).";
    if (!/^[A-Z0-9]+$/.test(v)) return "Passport number must be alphanumeric.";
  }

  if (type === "DRIVING_LICENSE") {
    if (v.length < 5) return "Driving license number looks too short.";
    if (v.length > 25) return "Driving license number looks too long.";
  }

  if (type === "VOTER_ID") {
    if (v.length < 6 || v.length > 20) return "Voter ID looks invalid (length).";
    if (!/^[A-Z0-9]+$/.test(v)) return "Voter ID must be alphanumeric.";
  }

  if (type === "OTHER" && v.length < 3) return "Document number looks too short.";
  return null;
}

function normalizeDocNumber(type: IdentityDocType, raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (type === "AADHAAR") return s.replace(/[^\d]/g, "").slice(0, 12);
  return s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function isISODate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

function cleanOpt(v: any): string | undefined {
  const s = String(v ?? "").trim();
  return s ? s : undefined;
}

function cleanDateOpt(v: any): string | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function makeId(): string {
  try {
    const c: any = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
