import { zcLoading } from "@/lib/loading-events";

export class ApiError<TData = any> extends Error {
  status: number;
  data?: TData;
  url?: string;
  method?: string;

  constructor(
    message: string,
    opts: { status: number; data?: TData; url?: string; method?: string } = { status: 0 },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.data = opts.data;
    this.url = opts.url;
    this.method = opts.method;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}

function clearAccessToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");
  } catch {
    // ignore
  }
}

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

/**
 * Your frontend mostly routes via Next rewrites (/api/*).
 * Some pages call apiFetch("/branches") etc — normalize to /api by default.
 */
function normalizeApiUrl(url: string): string {
  if (!url) return url;
  if (isAbsoluteUrl(url)) return url;

  if (url === "/api" || url.startsWith("/api/")) return url;

  // if caller passes "branches" (no leading slash), do not alter
  if (!url.startsWith("/")) return url;

  return `/api${url}`;
}

// Optional: integrate with GlobalLoader store (won't break if missing)
let loadingStore: any | null = null;
async function getLoadingStore() {
  if (typeof window === "undefined") return null;
  if (loadingStore) return loadingStore;
  try {
    loadingStore = await import("@/components/global-loading/store");
    return loadingStore;
  } catch {
    return null;
  }
}

/** ✅ Plain objects/arrays should be JSON.stringified. Do NOT stringify FormData/Blob/etc. */
function isJsonSerializableBody(x: any) {
  if (x == null) return false;
  if (typeof x !== "object") return false;

  if (typeof FormData !== "undefined" && x instanceof FormData) return false;
  if (typeof Blob !== "undefined" && x instanceof Blob) return false;
  if (typeof ArrayBuffer !== "undefined" && x instanceof ArrayBuffer) return false;
  if (typeof URLSearchParams !== "undefined" && x instanceof URLSearchParams) return false;
  if (ArrayBuffer.isView?.(x)) return false;

  return Array.isArray(x) || Object.getPrototypeOf(x) === Object.prototype;
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: any; // ✅ allow object bodies safely
  showLoader?: boolean; // default true
  loaderMessage?: string; // overrides default label
  /** If true, do NOT auto logout on 401 */
  noAutoLogout?: boolean;
  /**
   * Branch injection behavior for GLOBAL-scope principals.
   * - auto (default): inject/require activeBranchId only for known branch-scoped APIs
   * - require: always require an active branch for GLOBAL scope
   * - none: never inject/require branch in this call
   */
  branch?: "auto" | "require" | "none";
  /** Optional explicit branch override (rare; mostly for special flows/tests). */
  branchId?: string | null;
};

/* ------------------------- Frontend permission gate ------------------------- */

type ApiPermRule = {
  re: RegExp;
  read?: string;
  create?: string;
  update?: string;
  delete?: string;
  custom?: (path: string, method: string) => string | null;
};

function pickPermByMethod(rule: ApiPermRule, path: string, method: string): string | null {
  if (rule.custom) return rule.custom(path, method);
  const isRead = ["GET", "HEAD", "OPTIONS"].includes(method);
  if (isRead) return rule.read ?? null;
  if (method === "POST") return rule.create ?? rule.update ?? null;
  if (method === "PUT" || method === "PATCH") return rule.update ?? null;
  if (method === "DELETE") return rule.delete ?? rule.update ?? null;
  return rule.update ?? null;
}

const API_PERM_RULES: ApiPermRule[] = [
  // Branch registry
  { re: /^\/api\/branches(\/|$)/, read: "BRANCH_READ", create: "BRANCH_CREATE", update: "BRANCH_UPDATE", delete: "BRANCH_DELETE" },
  // Branch → Facilities mapping
  {
    re: /^\/api\/branches\/[^/]+\/facilities(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "BRANCH_FACILITY_READ";
      return "BRANCH_FACILITY_UPDATE";
    },
  },

  // Department ↔ Specialty mapping (must be more specific than /departments)
  {
    re: /^\/api\/departments\/[^/]+\/specialties(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "DEPARTMENT_SPECIALTY_READ";
      return "DEPARTMENT_SPECIALTY_UPDATE";
    },
  },

  // Departments / Specialties
  { re: /^\/api\/departments(\/|$)/, read: "DEPARTMENT_READ", create: "DEPARTMENT_CREATE", update: "DEPARTMENT_UPDATE", delete: "DEPARTMENT_UPDATE" },
  { re: /^\/api\/specialties(\/|$)/, read: "SPECIALTY_READ", create: "SPECIALTY_CREATE", update: "SPECIALTY_UPDATE", delete: "SPECIALTY_UPDATE" },
  // Facility master catalog (only CREATE exists today → use for write actions)
  {
    re: /^\/api\/facilities\/master(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "FACILITY_CATALOG_READ";
      return "FACILITY_CATALOG_CREATE";
    },
  },

  // Infrastructure: Unit Types / Units / Rooms / Resources / Locations
  {
    re: /^\/api\/infrastructure\/unit-types\/catalog(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "INFRA_UNITTYPE_READ";
      // Only UPDATE exists in catalog today
      return "INFRA_UNITTYPE_UPDATE";
    },
  },
  { re: /^\/api\/infrastructure\/units(\/|$)/, read: "INFRA_UNIT_READ", create: "INFRA_UNIT_CREATE", update: "INFRA_UNIT_UPDATE", delete: "INFRA_UNIT_DELETE" },
  { re: /^\/api\/infrastructure\/rooms(\/|$)/, read: "INFRA_ROOM_READ", create: "INFRA_ROOM_CREATE", update: "INFRA_ROOM_UPDATE", delete: "INFRA_ROOM_UPDATE" },
  { re: /^\/api\/infrastructure\/resources(\/|$)/, read: "INFRA_RESOURCE_READ", create: "INFRA_RESOURCE_CREATE", update: "INFRA_RESOURCE_UPDATE", delete: "INFRA_RESOURCE_UPDATE" },
  { re: /^\/api\/infrastructure\/locations(\/|$)/, read: "INFRA_LOCATION_READ", create: "INFRA_LOCATION_CREATE", update: "INFRA_LOCATION_UPDATE", delete: "INFRA_LOCATION_UPDATE" },

  // Branch infra-config (used by Bed Policy / Go-Live config editor)
  {
    re: /^\/api\/infrastructure\/branches\/[^/]+\/infra-config(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "INFRA_GOLIVE_READ";
      return "INFRA_GOLIVE_RUN";
    },
  },

  // Service configuration
  { re: /^\/api\/infrastructure\/(services|service-items)(\/|$)/, read: "INFRA_SERVICE_READ", create: "INFRA_SERVICE_CREATE", update: "INFRA_SERVICE_UPDATE", delete: "INFRA_SERVICE_UPDATE" },
  { re: /^\/api\/infrastructure\/service-library(\/|$)/, read: "INFRA_CODE_SET_READ", create: "INFRA_CODE_SET_CREATE", update: "INFRA_CODE_SET_UPDATE", delete: "INFRA_CODE_SET_UPDATE" },
  { re: /^\/api\/infrastructure\/service-catalogues(\/|$)/, read: "INFRA_SERVICE_CATALOGUE_READ", create: "INFRA_SERVICE_CATALOGUE_CREATE", update: "INFRA_SERVICE_CATALOGUE_UPDATE", delete: "INFRA_SERVICE_CATALOGUE_UPDATE" },
  { re: /^\/api\/infrastructure\/service-packages(\/|$)/, read: "INFRA_SERVICE_PACKAGE_READ", create: "INFRA_SERVICE_PACKAGE_CREATE", update: "INFRA_SERVICE_PACKAGE_UPDATE", delete: "INFRA_SERVICE_PACKAGE_UPDATE" },
  { re: /^\/api\/infrastructure\/order-sets(\/|$)/, read: "INFRA_ORDER_SET_READ", create: "INFRA_ORDER_SET_CREATE", update: "INFRA_ORDER_SET_UPDATE", delete: "INFRA_ORDER_SET_UPDATE" },

  // Service → Charge mapping
  {
    re: /^\/api\/infrastructure\/service-charge-mappings(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "INFRA_SERVICE_READ";
      return "INFRA_SERVICE_MAPPING_UPDATE";
    },
  },
  {
    re: /^\/api\/infrastructure\/services\/mapping(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "INFRA_SERVICE_READ";
      return "INFRA_SERVICE_MAPPING_UPDATE";
    },
  },

  // Billing configuration
  { re: /^\/api\/infrastructure\/charge-master(\/|$)/, read: "INFRA_CHARGE_MASTER_READ", create: "INFRA_CHARGE_MASTER_CREATE", update: "INFRA_CHARGE_MASTER_UPDATE", delete: "INFRA_CHARGE_MASTER_UPDATE" },
  { re: /^\/api\/infrastructure\/tax-codes(\/|$)/, read: "INFRA_TAX_CODE_READ", create: "INFRA_TAX_CODE_CREATE", update: "INFRA_TAX_CODE_UPDATE", delete: "INFRA_TAX_CODE_UPDATE" },
  { re: /^\/api\/infrastructure\/tariff-plans(\/|$)/, read: "INFRA_TARIFF_PLAN_READ", create: "INFRA_TARIFF_PLAN_CREATE", update: "INFRA_TARIFF_PLAN_UPDATE", delete: "INFRA_TARIFF_PLAN_UPDATE" },

  // Diagnostics
  { re: /^\/api\/infrastructure\/diagnostics(\/|$)/, read: "INFRA_DIAGNOSTICS_READ", create: "INFRA_DIAGNOSTICS_CREATE", update: "INFRA_DIAGNOSTICS_UPDATE", delete: "INFRA_DIAGNOSTICS_DELETE" },

  // Service availability
  { re: /^\/api\/infrastructure\/service-availability(\/|$)/, read: "INFRA_SERVICE_AVAILABILITY_READ", create: "INFRA_SERVICE_AVAILABILITY_UPDATE", update: "INFRA_SERVICE_AVAILABILITY_UPDATE", delete: "INFRA_SERVICE_AVAILABILITY_UPDATE" },

  // Fixit / Go-live
  { re: /^\/api\/infrastructure\/fixit(\/|$)/, read: "INFRA_FIXIT_READ", create: "INFRA_FIXIT_UPDATE", update: "INFRA_FIXIT_UPDATE", delete: "INFRA_FIXIT_UPDATE" },
  {
    re: /^\/api\/infrastructure\/branch\/go-live(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "INFRA_GOLIVE_READ";
      return "INFRA_GOLIVE_RUN";
    },
  },

  // OT
  {
    re: /^\/api\/infrastructure\/ot(\/|$)/,
    custom: (_p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "ot.suite.read";
      if (m === "POST") return "ot.suite.create";
      if (m === "DELETE") return "ot.suite.delete";
      return "ot.suite.update";
    },
  },

  // Governance / Policy
  { re: /^\/api\/governance\/audit(\/|$)/, read: "GOV_POLICY_AUDIT_READ" },
  { re: /^\/api\/governance\/approvals(\/|$)/, read: "GOV_POLICY_APPROVE" },
  {
    re: /^\/api\/governance\/policy-versions(\/|$)/,
    custom: (p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "GOV_POLICY_READ";
      if (p.endsWith("/approve") || p.endsWith("/reject")) return "GOV_POLICY_APPROVE";
      return "GOV_POLICY_SUBMIT";
    },
  },
  {
    re: /^\/api\/governance\/policies(\/|$)/,
    custom: (p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "GOV_POLICY_READ";
      if (p.endsWith("/drafts")) return "GOV_POLICY_GLOBAL_DRAFT";
      return "GOV_POLICY_SUBMIT";
    },
  },
  {
    re: /^\/api\/governance\/branch-policies(\/|$)/,
    custom: (p, method) => {
      const m = (method || "GET").toUpperCase();
      if (["GET", "HEAD", "OPTIONS"].includes(m)) return "GOV_POLICY_READ";
      if (p.endsWith("/override-drafts")) return "GOV_POLICY_BRANCH_OVERRIDE_DRAFT";
      return "GOV_POLICY_SUBMIT";
    },
  },
  { re: /^\/api\/governance\/(summary|branches|effective-policies)(\/|$)/, read: "GOV_POLICY_READ" },
];

function requiredPermForApi(url: string, method: string): string | null {
  const u = normalizeApiUrl(url);
  const path = u.split("?")[0] || "";
  if (!path.startsWith("/api/")) return null;

  // never gate auth / iam bootstrap
  if (path.startsWith("/api/auth")) return null;
  if (path.startsWith("/api/iam")) return null;

  const m = (method || "GET").toUpperCase();
  for (const rule of API_PERM_RULES) {
    if (rule.re.test(path)) return pickPermByMethod(rule, path, m);
  }
  return null;
}

async function assertApiPermission(url: string, method: string) {
  if (typeof window === "undefined") return;

  const required = requiredPermForApi(url, method);
  if (!required) return;

  try {
    const auth = await import("@/lib/auth/store");
    const state: any = auth.useAuthStore.getState();

    // if store isn't hydrated yet, skip the gate (bootstrap phase)
    if (!state?._hasHydrated) return;
    if (!state?.user) return;

    if (!auth.hasPerm(state.user, required)) {
      throw new ApiError("Forbidden", {
        status: 403,
        data: { code: "FORBIDDEN", requiredPerm: required },
        url: normalizeApiUrl(url),
        method: method || "GET",
      });
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return;
  }
}

/* ------------------------- Active Branch utilities ------------------------- */

type BranchSelectorRow = { id: string; isActive?: boolean };

let ensureBranchPromise: Promise<string | null> | null = null;

function getRoleScopeCookie(): "GLOBAL" | "BRANCH" | null {
  const v = String(getCookie("zypocare_scope") || "")
    .trim()
    .toUpperCase();
  if (v === "GLOBAL" || v === "BRANCH") return v as any;
  return null;
}

function hasBranchIdInUrl(u: string): boolean {
  try {
    const urlObj = new URL(u, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return Boolean(urlObj.searchParams.get("branchId"));
  } catch {
    return /[?&]branchId=/.test(u);
  }
}

function withBranchIdQuery(u: string, branchId: string): string {
  if (!branchId) return u;
  try {
    const isAbs = isAbsoluteUrl(u);
    const urlObj = new URL(u, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (!urlObj.searchParams.get("branchId")) urlObj.searchParams.set("branchId", branchId);
    const out = urlObj.pathname + urlObj.search + urlObj.hash;
    return isAbs ? urlObj.toString() : out;
  } catch {
    return u.includes("?") ? `${u}&branchId=${encodeURIComponent(branchId)}` : `${u}?branchId=${encodeURIComponent(branchId)}`;
  }
}

function isBranchScopedApi(u: string): boolean {
  if (!u.startsWith("/api/")) return false;

  if (u.startsWith("/api/auth")) return false;
  if (u.startsWith("/api/iam")) return false;
  if (u.startsWith("/api/branches")) return false;

  const path = u.split("?")[0] || u;
  const prefixes = [
    "/api/infrastructure/",
    "/api/billing/",
    "/api/inventory/",
    "/api/pharmacy/",
    "/api/ot/",
    "/api/departments",
    "/api/facilities",
    "/api/specialties",
  ];

  return prefixes.some((p) => path === p || path.startsWith(p));
}

async function getActiveBranchIdFromStore(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const mod = await import("@/lib/branch/active-branch");
    return mod.useActiveBranchStore.getState().activeBranchId;
  } catch {
    return null;
  }
}

async function setActiveBranchIdInStore(branchId: string | null) {
  if (typeof window === "undefined") return;
  try {
    const mod = await import("@/lib/branch/active-branch");
    mod.useActiveBranchStore.getState().setActiveBranchId(branchId);
  } catch {
    // ignore
  }
}

async function ensureActiveBranchId(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (ensureBranchPromise) return ensureBranchPromise;

  ensureBranchPromise = (async () => {
    const existing = await getActiveBranchIdFromStore();
    if (existing) return existing;

    try {
      const token = getAccessToken();
      const res = await fetch("/api/branches?mode=selector&onlyActive=true", {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" },
      });

      if (res.status === 401) {
        void hardLogoutIfBrowser();
        return null;
      }

      if (!res.ok) return null;
      const data = (await res.json()) as BranchSelectorRow[];
      const next = data?.find((b) => b.isActive) ?? data?.[0];
      if (!next?.id) return null;

      await setActiveBranchIdInStore(next.id);
      return next.id;
    } catch {
      return null;
    }
  })();

  try {
    return await ensureBranchPromise;
  } finally {
    ensureBranchPromise = null;
  }
}

let isLoggingOut = false;
async function hardLogoutIfBrowser() {
  if (typeof window === "undefined") return;
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  } finally {
    clearAccessToken();

    try {
      const mod = await import("@/lib/auth/store");
      mod.useAuthStore.getState().logout();
    } catch {
      // ignore
    }

    try {
      const here = window.location.pathname + window.location.search;
      const next = encodeURIComponent(here);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${next}`;
      }
    } catch {
      // ignore
    }
  }
}

async function safeReadResponse(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return null;
  if (ct.includes("application/json")) return res.json().catch(() => null);
  return res.text().catch(() => "");
}

function stripBranchIdFromObjectBody(body: any) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  if (!Object.prototype.hasOwnProperty.call(body, "branchId")) return body;
  const clone = { ...(body as any) };
  delete (clone as any).branchId;
  return clone;
}

export async function apiFetch<T>(url: string, init: ApiFetchOptions = {}): Promise<T> {
  const {
    showLoader = true,
    loaderMessage,
    noAutoLogout = false,
    branch = "auto",
    branchId: branchOverride = null,
    ...fetchInit
  } = init;

  const normalizedUrl = normalizeApiUrl(url);

  const method = (fetchInit.method ?? "GET").toUpperCase();
  const headers = new Headers(fetchInit.headers || {});
  headers.set("Accept", "application/json");

  let finalUrl = normalizedUrl;
  let finalBody: any = fetchInit.body;

  const isRead = ["GET", "HEAD", "OPTIONS"].includes(method);
  const isWrite = !isRead;

  // Attach token for protected APIs
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // ✅ Ensure GLOBAL scope calls to branch-scoped APIs have an active branch.
  if (typeof window !== "undefined" && branch !== "none") {
    const scope = getRoleScopeCookie();
    const needsBranch = branch === "require" || (branch === "auto" && isBranchScopedApi(finalUrl));

    if (needsBranch && scope === "GLOBAL") {
      const activeBranchId = branchOverride ?? (await ensureActiveBranchId());

      if (!activeBranchId) {
        throw new ApiError("Active branch is required. Please select a branch first.", {
          status: 409,
          data: { code: "BRANCH_REQUIRED" } as any,
          url: finalUrl,
          method,
        });
      }

      // Always prefer branch in query param (works for both create + update)
      if (!hasBranchIdInUrl(finalUrl)) {
        finalUrl = withBranchIdQuery(finalUrl, activeBranchId);
      }

      // Observability only
      if (!headers.has("X-Active-Branch-Id")) headers.set("X-Active-Branch-Id", activeBranchId);

      // ✅ IMPORTANT:
      // For UPDATE calls, backend forbids branchId in DTO — strip it if UI accidentally sends it
      if (isWrite && method !== "POST") {
        if (isJsonSerializableBody(finalBody)) {
          finalBody = stripBranchIdFromObjectBody(finalBody);
        } else if (typeof finalBody === "string") {
          const trimmed = finalBody.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "branchId" in parsed) {
                delete (parsed as any).branchId;
                finalBody = JSON.stringify(parsed);
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // ✅ For CREATE calls only, if body is JSON string/object and already has branchId empty, fill it.
      // (We do NOT add a new branchId field for updates.)
      if (isWrite && method === "POST") {
        if (isJsonSerializableBody(finalBody) && typeof finalBody === "object" && !Array.isArray(finalBody)) {
          if ("branchId" in finalBody && !finalBody.branchId) finalBody = { ...finalBody, branchId: activeBranchId };
        } else if (typeof finalBody === "string") {
          const trimmed = finalBody.trim();
          if (trimmed.startsWith("{")) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                if ("branchId" in parsed && !(parsed as any).branchId) (parsed as any).branchId = activeBranchId;
                finalBody = JSON.stringify(parsed);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  // ✅ Frontend permission firewall
  await assertApiPermission(finalUrl, method);

  const label = loaderMessage ?? (isRead ? "Loading…" : "Saving changes…");

  const loadingId = zcLoading.start({
    kind: "api",
    method,
    url: finalUrl,
    label,
  });

  const store = showLoader ? await getLoadingStore() : null;
  if (showLoader && store?.startLoading) store.startLoading(label);

  try {
    if (isWrite) {
      const csrf = getCookie("xc_csrf");
      if (csrf && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", csrf);
    }

    // ✅ MAIN JSON FIX: stringify plain object/array bodies
    const isFormData = typeof FormData !== "undefined" && finalBody instanceof FormData;

    if (isWrite && finalBody != null && isJsonSerializableBody(finalBody)) {
      finalBody = JSON.stringify(finalBody);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    } else if (isWrite && typeof finalBody === "string") {
      const t = finalBody.trim();
      const looksJson = t.startsWith("{") || t.startsWith("[");
      if (looksJson && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    } else if (isWrite && isFormData) {
      // do not set content-type for FormData (browser will set boundary)
      if (headers.has("Content-Type")) headers.delete("Content-Type");
    }

    const res = await fetch(finalUrl, {
      ...fetchInit,
      body: finalBody as any,
      method,
      headers,
      credentials: "include",
    });

    const data: any = await safeReadResponse(res);

    if (!res.ok) {
      if (!noAutoLogout && res.status === 401) {
        void hardLogoutIfBrowser();
      }

      const msg =
        data?.message ||
        data?.error ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;

      throw new ApiError(msg, {
        status: res.status,
        data,
        url: finalUrl,
        method,
      });
    }

    // Notify AI copilot on successful writes so health/insights refresh
    if (isWrite && typeof window !== "undefined") {
      try { window.dispatchEvent(new Event("zc:data-changed")); } catch { /* ignore */ }
    }

    return data as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    const msg = e?.message ? String(e.message) : "Network error";
    throw new ApiError(msg, { status: 0, data: undefined, url: finalUrl, method });
  } finally {
    zcLoading.end(loadingId);
    if (showLoader && store?.stopLoading) store.stopLoading();
  }
}

/* ----------------------------- IAM helpers ----------------------------- */

export type Principal = {
  userId: string;
  email: string;
  name: string;
  branchId: string | null;
  roleCode: string | null;
  roleScope: "GLOBAL" | "BRANCH" | null;
  roleVersionId: string | null;
  permissions: string[];
};

export async function getMe(opts: { showLoader?: boolean } = {}): Promise<Principal> {
  const res = await apiFetch<{ principal: Principal }>("/api/iam/me", {
    showLoader: opts.showLoader ?? false,
  });
  return res.principal;
}

export async function syncPrincipalToAuthStore(): Promise<Principal | null> {
  if (typeof window === "undefined") return null;

  const token = getAccessToken();
  if (!token) return null;

  try {
    const principal = await getMe({ showLoader: false });

    const mod = await import("@/lib/auth/store");
    const store = mod.useAuthStore;

    const st = store.getState();
    const currentUser = st.user;

    if (currentUser) {
      st.updateUser({
        id: principal.userId,
        email: principal.email,
        name: principal.name,
        roleCode: principal.roleCode,
        roleScope: principal.roleScope,
        permissions: principal.permissions,
        branchId: principal.branchId,
        role: (principal.roleCode ?? currentUser.role) as any,
      });
    } else {
      st.login(
        {
          id: principal.userId,
          email: principal.email,
          name: principal.name,
          role: (principal.roleCode ?? "BRANCH_ADMIN") as any,
          roleCode: principal.roleCode,
          roleScope: principal.roleScope,
          permissions: principal.permissions,
          branchId: principal.branchId,
        } as any,
        token,
      );
    }

    return principal;
  } catch {
    return null;
  }
}
