// apps/web/src/lib/loading-events.ts
// A tiny, dependency-free event bus for app-wide loading indicators.

export type ZcLoadingStartDetail = {
  id: string;
  label?: string;
  kind?: "api" | "route" | "action";
  method?: string;
  url?: string;
};

export type ZcLoadingEndDetail = {
  id: string;
};

function uid() {
  // Works on modern browsers; fallback for older ones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  return c?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const zcLoading = {
  start(detail: Omit<ZcLoadingStartDetail, "id"> & { id?: string } = {}) {
    const id = detail.id ?? uid();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<ZcLoadingStartDetail>("xc:loading:start", {
          detail: { ...detail, id },
        })
      );
    }
    return id;
  },

  end(id: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<ZcLoadingEndDetail>("xc:loading:end", {
          detail: { id },
        })
      );
    }
  },
};
