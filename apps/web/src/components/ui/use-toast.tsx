"use client";

import * as React from "react";

type ToastVariant = "default" | "success" | "info" | "warning" | "destructive";

export type ToastPayload = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number; // ms
};

type ToastState = ToastPayload & {
  id: string;
  open: boolean;
};

type Action =
  | { type: "ADD"; toast: ToastState }
  | { type: "UPDATE"; toast: Partial<ToastState> & { id: string } }
  | { type: "DISMISS"; id?: string }
  | { type: "REMOVE"; id?: string };

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;
const TOAST_DEFAULT_DURATION = 3500;

function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function reducer(state: ToastState[], action: Action): ToastState[] {
  switch (action.type) {
    case "ADD":
      return [action.toast, ...state].slice(0, TOAST_LIMIT);

    case "UPDATE":
      return state.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t));

    case "DISMISS":
      return state.map((t) =>
        action.id && t.id !== action.id
          ? t
          : {
              ...t,
              open: false,
            },
      );

    case "REMOVE":
      return action.id ? state.filter((t) => t.id !== action.id) : [];

    default:
      return state;
  }
}

let memoryState: ToastState[] = [];
const listeners = new Set<(state: ToastState[]) => void>();

// one map for "remove after close"
const removeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
// one map for "auto dismiss after duration"
const dismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  for (const l of listeners) l(memoryState);
}

function scheduleRemove(id: string) {
  if (removeTimeouts.has(id)) return;

  const timeout = setTimeout(() => {
    removeTimeouts.delete(id);
    dispatch({ type: "REMOVE", id });
  }, TOAST_REMOVE_DELAY);

  removeTimeouts.set(id, timeout);
}

function scheduleAutoDismiss(id: string, duration: number) {
  // If an auto-dismiss is already scheduled, keep the earliest one.
  if (dismissTimeouts.has(id)) return;

  const timeout = setTimeout(() => {
    dismissTimeouts.delete(id);
    dispatch({ type: "DISMISS", id });
    scheduleRemove(id);
  }, Math.max(0, duration));

  dismissTimeouts.set(id, timeout);
}

export function toast(payload: ToastPayload) {
  const id = payload.id ?? genId();
  const duration = payload.duration ?? TOAST_DEFAULT_DURATION;

  const t: ToastState = {
    ...payload,
    id,
    open: true,
    duration,
  };

  dispatch({ type: "ADD", toast: t });

  // ✅ Guaranteed auto-dismiss (fixes “toast stays forever”)
  scheduleAutoDismiss(id, duration);

  return {
    id,
    dismiss: () => {
      dispatch({ type: "DISMISS", id });
      scheduleRemove(id);
    },
    update: (next: ToastPayload) => {
      const nextDuration = next.duration ?? duration;
      dispatch({ type: "UPDATE", toast: { ...next, id, duration: nextDuration } });
      // If caller extends duration, you can decide to re-schedule.
      // We keep the first schedule for predictability.
    },
  };
}

export function useToast() {
  const [state, setState] = React.useState<ToastState[]>(memoryState);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    toasts: state,
    toast,
    dismiss: (id?: string) => {
      dispatch({ type: "DISMISS", id });

      if (id) {
        scheduleRemove(id);
      } else {
        for (const t of memoryState) scheduleRemove(t.id);
      }
    },
  };
}
