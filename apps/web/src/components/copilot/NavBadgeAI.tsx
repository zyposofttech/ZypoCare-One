"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Map sidebar nav href → health issue area.
 * Must match the _issue_area() mapping in ai-copilot/src/app.py.
 */
const HREF_TO_AREA: Record<string, string> = {
  "/branches": "branches",
  "/infrastructure/locations": "locations",
  "/infrastructure/departments": "departments",
  "/infrastructure/unit-types": "unit-types",
  "/infrastructure/units": "units",
  "/infrastructure/rooms": "rooms",
  "/infrastructure/resources": "resources",
  // Billing Setup
  "/infrastructure/tax-codes": "tax-codes",
  "/infrastructure/charge-master": "charge-master",
  "/infrastructure/tariff-plans": "tariff-plans",
  "/infrastructure/payers": "payers",
  "/infrastructure/payer-contracts": "payer-contracts",
  "/infrastructure/gov-schemes": "gov-schemes",
  "/infrastructure/pricing-tiers": "pricing-tiers",
  "/infrastructure/price-history": "price-history",
  // Service Catalogue
  "/infrastructure/service-items": "service-items",
  "/infrastructure/service-library": "service-library",
  "/infrastructure/service-mapping": "service-mapping",
  "/infrastructure/service-catalogues": "service-catalogues",
  "/infrastructure/service-packages": "service-packages",
  "/infrastructure/order-sets": "order-sets",
  "/infrastructure/service-availability": "service-availability",
  "/infrastructure/service-bulk-import": "service-bulk-import",
  "/infrastructure": "infrastructure",
  // Billing & Claims
  "/billing": "billing",
  "/billing/preauth": "billing-preauth",
  "/billing/claims": "billing-claims",
  "/billing/claims-dashboard": "billing-claims-dashboard",
  "/billing/reconciliation": "billing-reconciliation",
  "/billing/insurance-policies": "billing-insurance-policies",
  "/billing/insurance-cases": "billing-insurance-cases",
  "/billing/insurance-documents": "billing-insurance-documents",
  "/billing/document-checklists": "billing-document-checklists",
  "/billing/payer-integrations": "billing-payer-integrations",
  // Compliance & Governance
  "/compliance": "compliance",
  "/compliance/workspaces": "compliance-workspaces",
  "/compliance/evidence": "compliance-evidence",
  "/compliance/approvals": "compliance-approvals",
  "/compliance/abdm": "compliance-abdm",
  "/compliance/abdm/abha": "compliance-abdm-abha",
  "/compliance/abdm/hfr": "compliance-abdm-hfr",
  "/compliance/abdm/hpr": "compliance-abdm-hpr",
  "/compliance/schemes": "compliance-schemes",
  "/compliance/schemes/pmjay": "compliance-schemes-pmjay",
  "/compliance/schemes/cghs": "compliance-schemes-cghs",
  "/compliance/schemes/echs": "compliance-schemes-echs",
  "/compliance/schemes/mapping": "compliance-schemes-mapping",
  "/compliance/nabh": "compliance-nabh",
  "/compliance/nabh/checklist": "compliance-nabh-checklist",
  "/compliance/nabh/audits": "compliance-nabh-audits",
  "/compliance/validator": "compliance-validator",
  "/compliance/audit-log": "compliance-audit-log",
};

/**
 * Small AI-driven badge that shows issue count on sidebar nav items.
 * Reads health data from sessionStorage (broadcast by CopilotProvider).
 *
 * Usage: <NavBadgeAI href="/branches" /> next to a sidebar link.
 */
export function NavBadgeAI({ href }: { href: string }) {
  const [count, setCount] = React.useState(0);
  const [severity, setSeverity] = React.useState<"blocker" | "warning" | null>(null);

  const area = HREF_TO_AREA[href];

  React.useEffect(() => {
    if (!area) return;

    function readHealth() {
      try {
        // Merge issues from both infrastructure and compliance health stores
        const allIssues: { area: string; severity: string }[] = [];

        const rawInfra = sessionStorage.getItem("zc.copilot.health");
        if (rawInfra) {
          const infra = JSON.parse(rawInfra);
          if (infra?.topIssues) allIssues.push(...infra.topIssues);
        }

        const rawComp = sessionStorage.getItem("zc.copilot.compliance-health");
        if (rawComp) {
          const comp = JSON.parse(rawComp);
          if (comp?.topIssues) allIssues.push(...comp.topIssues);
        }

        if (allIssues.length === 0) {
          setCount(0);
          setSeverity(null);
          return;
        }

        // For parent areas like "compliance-abdm", also match children like "compliance-abdm-hfr"
        const issues = allIssues.filter(
          (i) => i.area === area || i.area.startsWith(area + "-")
        );
        const blockers = issues.filter(
          (i) => i.severity === "BLOCKER"
        );
        const total = issues.length;

        setCount(total);
        setSeverity(blockers.length > 0 ? "blocker" : total > 0 ? "warning" : null);
      } catch {
        // ignore
      }
    }

    readHealth();

    const handler = () => readHealth();
    window.addEventListener("zc:health-update", handler);
    return () => window.removeEventListener("zc:health-update", handler);
  }, [area]);

  if (!area || !count || !severity) return null;

  return (
    <span
      className={cn(
        "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
        severity === "blocker" ? "bg-red-500" : "bg-amber-500"
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
