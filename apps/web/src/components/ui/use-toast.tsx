"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive";

type ToastActionElement = React.ReactNode;

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastActionElement;
  duration?: number;
};

type ToastInput = Omit<ToastProps, "id">;

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

type State = { toasts: ToastProps[] };
type Action =
  | { type: "ADD_TOAST"; toast: ToastProps }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastProps> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST": {
      const toasts = [action.toast, ...state.toasts].slice(0, TOAST_LIMIT);
      return { ...state, toasts };
    }
    case "UPDATE_TOAST": {
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };
    }
    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId }), TOAST_REMOVE_DELAY);
      } else {
        state.toasts.forEach((t) =>
          setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId: t.id }), TOAST_REMOVE_DELAY),
        );
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toastId ? (t.id === toastId ? { ...t, duration: 0 } : t) : { ...t, duration: 0 },
        ),
      };
    }
    case "REMOVE_TOAST": {
      if (!action.toastId) return { ...state, toasts: [] };
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    }
    default:
      return state;
  }
}

export function toast(input: ToastInput) {
  const id = genId();

  dispatch({
    type: "ADD_TOAST",
    toast: {
      id,
      duration: input.duration ?? 3500,
      variant: input.variant ?? "default",
      title: input.title,
      description: input.description,
      action: input.action,
    },
  });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (patch: Partial<ToastInput>) => dispatch({ type: "UPDATE_TOAST", toast: { id, ...patch } }),
  };
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
