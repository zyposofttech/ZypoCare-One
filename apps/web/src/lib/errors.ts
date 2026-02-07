// apps/web/src/lib/errors.ts
import { ApiError } from "@/lib/api";

function pickMessageFromData(data: any): string | null {
  if (!data) return null;

  // If backend returned plain string
  if (typeof data === "string") return data;

  // Common NestJS / HttpException shapes:
  // { message: string | string[], error?: string, statusCode?: number }
  const m = (data?.message ?? data?.error ?? data?.detail ?? data?.details) as any;

  if (Array.isArray(m)) return m.filter(Boolean).join(" • ");
  if (typeof m === "string") return m;

  // Sometimes the response is { errors: [...] }
  if (Array.isArray(data?.errors)) {
    const msgs = data.errors
      .map((x: any) => x?.message || x?.msg || x?.error)
      .filter(Boolean);
    if (msgs.length) return msgs.join(" • ");
  }

  return null;
}

/**
 * Safe, consistent error-to-string utility for UI toasts + banners.
 */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  try {
    // apiFetch throws ApiError
    if (err instanceof ApiError) {
      const fromData = pickMessageFromData((err as any).data);
      if (fromData) return fromData;

      if (typeof err.message === "string" && err.message.trim()) return err.message;

      // Optional: nicer default by status
      if (err.status === 401) return "Session expired. Please login again.";
      if (err.status === 403) return "You don’t have permission to perform this action.";
      if (err.status >= 500) return "Server error. Please try again.";

      return fallback;
    }

    // Normal Error
    if (err instanceof Error) {
      return err.message?.trim() ? err.message : fallback;
    }

    // String thrown
    if (typeof err === "string") return err.trim() ? err : fallback;

    // Unknown object with message
    if (err && typeof err === "object") {
      const fromObj = pickMessageFromData(err as any);
      if (fromObj) return fromObj;

      const msg = (err as any).message;
      if (typeof msg === "string" && msg.trim()) return msg;
      if (Array.isArray(msg)) return msg.filter(Boolean).join(" • ");
    }

    return fallback;
  } catch {
    return fallback;
  }
}
