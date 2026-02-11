"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

type UploadResp = { url: string };

function fileNameFromUrl(url: string) {
  try {
    const u = new URL(url, "http://local");
    const p = u.pathname.split("/").pop() || "";
    return decodeURIComponent(p);
  } catch {
    return url.split("/").pop() || url;
  }
}

function isImage(url: string) {
  const s = url.toLowerCase();
  return s.endsWith(".jpg") || s.endsWith(".jpeg") || s.endsWith(".png") || s.endsWith(".webp");
}

export function EvidenceUpload({
  label = "Evidence files",
  hint = "Upload image/PDF. URL will be stored automatically.",
  draftId,
  kind = "EVIDENCE", // or "IDENTITY_DOC" if you didn’t add EVIDENCE kind
  value,
  onChange,
  className,
}: {
  label?: string;
  hint?: string;
  draftId: string | null;
  kind?: "IDENTITY_DOC" | "EVIDENCE";
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

  async function uploadOne(file: File) {
    if (!draftId) throw new Error("draftId missing");
    const max = 5 * 1024 * 1024;
    if (file.size > max) throw new Error("Max file size is 5MB.");

    const mime = (file.type || "").toLowerCase();
    const ok = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"].includes(mime);
    if (!ok) throw new Error("Only JPG/PNG/WEBP/PDF allowed.");

    const fd = new FormData();
    fd.append("contextId", draftId);
    fd.append("kind", kind);
    fd.append("file", file);

    const res = await apiFetch<UploadResp>("/api/infrastructure/files/upload", {
      method: "POST",
      body: fd,
      showLoader: false,
    });

    if (!res?.url) throw new Error("Upload failed (no URL returned).");
    return res.url;
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-zc-muted">{label}</Label>
        <span className="text-[10px] text-zc-muted">{hint}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
      accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
        multiple
        onChange={async (e) => {
          const files = Array.from(e.currentTarget.files || []);
          if (!files.length) return;

          try {
            setUploading(true);
            const urls: string[] = [];
            for (const f of files) {
              const url = await uploadOne(f);
              urls.push(url);
            }
            const next = Array.from(new Set([...(value || []), ...urls]));
            onChange(next);
            toast({ title: "Uploaded", description: `${urls.length} file(s) uploaded.` });
          } catch (err: any) {
            toast({ variant: "destructive", title: "Upload failed", description: err?.message ?? "Could not upload evidence." });
          } finally {
            setUploading(false);
            e.currentTarget.value = "";
          }
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 border-zc-border"
          disabled={!draftId || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
        <span className="text-xs text-zc-muted">JPG / PNG / WEBP / PDF · max 5MB</span>
      </div>

      {value?.length ? (
        <div className="grid gap-2 pt-1">
          {value.map((url) => (
            <div
              key={url}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zc-border bg-zc-panel/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-xs text-zc-foreground truncate">{fileNameFromUrl(url)}</div>
                <div className="text-[10px] text-zc-muted truncate">{url}</div>
              </div>

              <div className="flex items-center gap-2">
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-zc-accent underline underline-offset-2">
                  Open
                </a>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 border-zc-border px-2 text-xs"
                  onClick={() => onChange((value || []).filter((x) => x !== url))}
                >
                  Remove
                </Button>
              </div>

              {isImage(url) ? (
                <div className="w-full">
                  <img src={url} alt="Evidence" className="mt-2 h-28 w-auto max-w-full rounded-md border border-zc-border object-contain bg-black/10" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-zc-border bg-zc-panel/40 p-3 text-xs text-zc-muted">
          No files uploaded yet.
        </div>
      )}
    </div>
  );
}
async function openAuthedFile(url: string, token: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to load file (${res.status})`);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  window.open(blobUrl, "_blank", "noopener,noreferrer");

  // cleanup later
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

