"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { zcLoading } from "@/lib/loading-events";

function isModifiedEvent(e: MouseEvent) {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0;
}

function findAnchor(el: HTMLElement | null): HTMLAnchorElement | null {
  while (el) {
    if (el instanceof HTMLAnchorElement) return el;
    el = el.parentElement;
  }
  return null;
}

function isInternalNavigableLink(a: HTMLAnchorElement) {
  const href = a.getAttribute("href");
  if (!href) return false;

  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (a.hasAttribute("download")) return false;
  if (a.target && a.target !== "_self") return false;

  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const next = url.pathname + url.search;
  const current = window.location.pathname + window.location.search;
  if (next === current) return false;

  return true;
}

function shouldStartForUrl(urlLike: string | URL | null | undefined) {
  if (!urlLike) return false;
  const url = new URL(String(urlLike), window.location.href);

  const next = url.pathname + url.search;
  const current = window.location.pathname + window.location.search;

  // Ignore hash-only changes
  if (next === current) return false;

  // Same origin only
  return url.origin === window.location.origin;
}

export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeLoadId = React.useRef<string | null>(null);
  const lastKey = React.useRef<string>("");

  React.useEffect(() => {
    lastKey.current = `${window.location.pathname}?${window.location.search}`;
  }, []);

  React.useEffect(() => {
    function startRouteLoader(label = "Opening page…") {
      if (routeLoadId.current) return;
      routeLoadId.current = zcLoading.start({ kind: "route", label });
    }

    // 1) Anchor click navigation
    function onClick(e: MouseEvent) {
      if (isModifiedEvent(e)) return;
      const a = findAnchor(e.target as HTMLElement);
      if (!a) return;
      if (!isInternalNavigableLink(a)) return;

      startRouteLoader("Opening page…");
    }

    // 2) Back/forward
    function onPopState() {
      startRouteLoader("Opening page…");
    }

    // 3) Programmatic navigation (router.push/replace)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (state, title, url) {
      try {
        if (shouldStartForUrl(url)) startRouteLoader("Opening page…");
      } catch {
        // ignore
      }
      
      return originalPushState.apply(this, arguments as any);
    };

    history.replaceState = function (state, title, url) {
      try {
        if (shouldStartForUrl(url)) startRouteLoader("Opening page…");
      } catch {
        // ignore
      }
      return originalReplaceState.apply(this, arguments as any);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // End loader when the route actually commits (URL changes observed by Next hooks)
  React.useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (!key) return;

    if (key !== lastKey.current) {
      lastKey.current = key;

      if (routeLoadId.current) {
        const id = routeLoadId.current;
        routeLoadId.current = null;

        requestAnimationFrame(() => {
          setTimeout(() => zcLoading.end(id), 120);
        });
      }
    }
  }, [pathname, searchParams]);

  return null;
}
