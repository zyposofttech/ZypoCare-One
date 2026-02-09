"use client";

import * as React from "react";
import { useCopilot } from "./CopilotProvider";
import type { PageContext } from "./types";

/**
 * Hook for pages to register their context with the copilot.
 *
 * Usage:
 *   usePageCopilot({ module: "room", action: "create", formData: { unitTypeCode: "ICU" } });
 */
export function usePageCopilot(ctx: PageContext) {
  const { setPageContext } = useCopilot();

  React.useEffect(() => {
    setPageContext(ctx);
    return () => setPageContext(null);
    // Intentionally shallow-compare on serialized value to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ctx), setPageContext]);
}
