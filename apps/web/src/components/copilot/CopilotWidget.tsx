"use client";

import * as React from "react";
import { useCopilot } from "@/lib/copilot/CopilotProvider";
import { CopilotFAB } from "./CopilotFAB";
import { CopilotPanel } from "./CopilotPanel";

/**
 * Copilot Widget — FAB + sliding side panel.
 * Rendered once in AppShell, available on all pages.
 */
export function CopilotWidget() {
  const { widgetOpen, setWidgetOpen } = useCopilot();

  // Keyboard shortcut: Ctrl+Shift+A
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "A" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        setWidgetOpen(!widgetOpen);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [widgetOpen, setWidgetOpen]);

  return (
    <>
      {!widgetOpen && <CopilotFAB onClick={() => setWidgetOpen(true)} />}
      {widgetOpen && (
        <CopilotPanel onClose={() => setWidgetOpen(false)} />
      )}
    </>
  );
}
