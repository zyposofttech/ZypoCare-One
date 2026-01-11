// apps/web/src/lib/notify.ts
export type NotifyTone = "neutral" | "success" | "info" | "warning" | "danger";

export type NotifyPayload = {
  title: string;
  description?: string;
  tone?: NotifyTone;
  timeoutMs?: number;
};

function emit(payload: NotifyPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("xc:toast", { detail: payload }));
}

export const notify = {
  success(title: string, description?: string) {
    emit({ title, description, tone: "success" });
  },
  info(title: string, description?: string) {
    emit({ title, description, tone: "info" });
  },
  warning(title: string, description?: string) {
    emit({ title, description, tone: "warning" });
  },
  error(title: string, description?: string) {
    emit({ title, description, tone: "danger" });
  },
};
