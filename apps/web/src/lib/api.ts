import { useAuthStore } from "@/lib/auth/store";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  
  // 1. Force JSON accept
  headers.set("Accept", "application/json");

  // 2. Attach the Bearer Token from Zustand Store (FIX IS HERE)
  const token = useAuthStore.getState().token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // 3. Handle mutating requests (CSRF + Content-Type)
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (mutating) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const csrf = getCookie("xc_csrf"); 
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  // 4. Execute Fetch
  const res = await fetch(url, { ...init, method, headers, credentials: "include" });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}