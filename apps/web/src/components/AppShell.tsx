"use client";

import * as React from "react";
import { LinkWithLoader as Link } from "@/components/LinkWithLoader";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { BranchSelector } from "@/components/BranchSelector";
import { initActiveBranchSync } from "@/lib/branch/active-branch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { CopilotProvider } from "@/lib/copilot/CopilotProvider";
import { CopilotWidget } from "@/components/copilot/CopilotWidget";
import { NavBadgeAI } from "@/components/copilot/NavBadgeAI";
import {
  IconBed,
  IconBrain,
  IconBuilding,
  IconZypoCare,
  IconChart,
  IconChevronDown,
  IconChevronRight,
  IconClipboard,
  IconDashboard,
  IconFlask,
  IconKeyboard,
  IconLogout,
  IconPlus,
  IconPanelLeft,
  IconPanelRight,
  IconPill,
  IconReceipt,
  IconSearch,
  IconShield,
  IconStethoscope,
  IconUsers,
  IconRefresh,
  IconDroplet,
  type IconProps,
} from "@/components/icons";
import { useActiveBranchStore } from "@/lib/branch/active-branch";

function IconRefreshLocal(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 11a8 8 0 1 0 2 5" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function IconBellLocal(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// --- Types & Data ---

type NavBadgeDef = { label: string; tone?: "neutral" | "info" | "new" | "soon" };

type NavChildLink = {
  type?: "link";
  label: string;
  href: string;
  badge?: NavBadgeDef;
};

type NavChildGroup = {
  type: "group";
  label: string;
  children: NavChildLink[];
};

type NavChild = NavChildLink | NavChildGroup;

type NavNode = {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
  badge?: NavBadgeDef;
  children?: NavChild[];
};

type NavGroup = {
  title: string;
  items: NavNode[];
};

type GlobalRefreshOptions = { hard?: boolean };
type GlobalRefreshFn = (opts?: GlobalRefreshOptions) => void;

const GlobalRefreshContext = React.createContext<GlobalRefreshFn | null>(null);

/**
 * Allows any child component to trigger an app-wide refresh.
 * If used outside AppShell, it falls back to a hard reload.
 */
export function useGlobalRefresh(): GlobalRefreshFn {
  return (
    React.useContext(GlobalRefreshContext) ??
    (() => {
      if (typeof window !== "undefined") window.location.reload();
    })
  );
}

function resolveRoleScope(user: any): "GLOBAL" | "BRANCH" | null {
  if (!user) return null;
  const scope = user.roleScope as ("GLOBAL" | "BRANCH" | null | undefined);
  if (scope === "GLOBAL" || scope === "BRANCH") return scope;

  const roleCode = normRole(user.roleCode ?? user.role);
  if (roleCode === "SUPER_ADMIN" || roleCode === "CORPORATE_ADMIN" || roleCode === "GLOBAL_ADMIN") return "GLOBAL";
  if (roleCode === "BRANCH_ADMIN") return "BRANCH";
  if (user.branchId) return "BRANCH";
  return null;
}

function roleLabel(user: any) {
  return String(user?.roleCode ?? user?.role ?? "").replaceAll("_", " ") || "UNKNOWN";
}

function buildAllNavItems(groups: NavGroup[]) {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      const results: {
        label: string;
        href: string;
        icon: React.ComponentType<IconProps>;
        group: string;
        type: "Parent" | "Child";
        parent?: string;
      }[] = [
          {
            label: item.label,
            href: item.href,
            icon: item.icon,
            group: group.title,
            type: "Parent",
          },
        ];

      const childLinks = flattenChildLinks(item.children);
      if (childLinks.length) {
        results.push(
          ...childLinks.map(({ link, groupLabel }) => ({
            label: link.label,
            href: link.href,
            icon: item.icon,
            group: group.title,
            type: "Child" as const,
            parent: groupLabel ? `${item.label} - ${groupLabel}` : item.label,
          }))
        );
      }
      return results;
    })
  );
}

const NAV_WORKSPACES: NavNode[] = [
  // {
  //   label: "Welcome",
  //   href: "/welcome",
  //   icon: IconZypoCare,
  // },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: IconDashboard,
  },
   {
    label: "Infrastructure Setup",
    href: "/infrastructure",
    icon: IconBuilding,
    children: [
      { label: "Overview", href: "/infrastructure" },
      {
        type: "group",
        label: "Branch & Location",
        children: [
         { label: "Branches", href: "/branches" },
          { label: "Locations (Building)", href: "/infrastructure/locations" },
        ],
      },
      {
        type: "group",
        label: "Org & Clinical Structure",
        children: [
          { label: "Specialties", href: "/infrastructure/specialties" },
          { label: "Departments", href: "/infrastructure/departments" },
        ],
      },
      {
        type: "group",
        label: "Infra Core",
        children: [
          
          { label: "Unit Types", href: "/infrastructure/unit-types" },
          { label: "Units", href: "/infrastructure/units" },
          { label: "Rooms / Bays", href: "/infrastructure/rooms" },
          { label: "Resources", href: "/infrastructure/resources" },
        ],
      },
      
      {
        type: "group",
        label: "Human Resource",
        children: [
          { label: "Overview", href: "/infrastructure/human-resource" },
           { label: "Staff Directory", href: "/infrastructure/human-resource/staff" },
           // Onboarding entry uses a server redirect that attaches a local draftId.
           // This avoids a blank intermediate screen and keeps navigation consistent.
           { label: "Onboarding", href: "/infrastructure/human-resource/staff/onboarding" },
          { label: "Roster", href: "/infrastructure/human-resource/roster" },
          { label: "Attendance", href: "/infrastructure/human-resource/attendance" },
          { label: "Leaves", href: "/infrastructure/human-resource/leaves" },
          { label: "Separation", href: "/infrastructure/human-resource/separation" },
        ],
      },
      {
        type: "group",
        label: "Clinical Facilities",
        children: [
          { label: "OT Setup", href: "/infrastructure/ot" },
          { label: "Diagnostics Configuration", href: "/infrastructure/diagnostics" },
          { label: "Equipment Register", href: "/infrastructure/equipment" },
        ],
      },
      {
        type: "group",
        label: "Pharmacy Infrastructure",
        children: [
          { label: "Pharmacy Overview", href: "/infrastructure/pharmacy" },
          { label: "Pharmacy Stores", href: "/infrastructure/pharmacy/stores" },
          { label: "Drug Master", href: "/infrastructure/pharmacy/drugs" },
          { label: "Formulary", href: "/infrastructure/pharmacy/formulary" },
          { label: "Suppliers", href: "/infrastructure/pharmacy/suppliers" },
          { label: "Inventory Config", href: "/infrastructure/pharmacy/inventory" },
          { label: "Narcotics Vault", href: "/infrastructure/pharmacy/narcotics" },
          { label: "Indent Mapping", href: "/infrastructure/pharmacy/indent-mapping" },
          { label: "Drug Interactions", href: "/infrastructure/pharmacy/interactions" },
          { label: "Substitutions", href: "/infrastructure/pharmacy/substitutions" },
          { label: "Drug Categories", href: "/infrastructure/pharmacy/categories" },
          { label: "Bulk Import", href: "/infrastructure/pharmacy/bulk-import" },
        ],
      },
      {
        type: "group",
        label: "Billing Setup",
        children: [
          { label: "Tax Codes (GST)", href: "/infrastructure/tax-codes" },
          { label: "Charge Master", href: "/infrastructure/charge-master" },
          { label: "Tariff Plans & Rates", href: "/infrastructure/tariff-plans" },
          { label: "Payer Management", href: "/infrastructure/payers" },
          { label: "Payer Contracts", href: "/infrastructure/payer-contracts" },
          { label: "Payer Outstanding", href: "/infrastructure/payer-outstanding" },
          { label: "Government Schemes", href: "/infrastructure/gov-schemes" },
          { label: "Pricing Tiers", href: "/infrastructure/pricing-tiers" },
          { label: "Pricing Rules", href: "/infrastructure/pricing-rules" },
          { label: "Price History", href: "/infrastructure/price-history" },
        ],
      },
      {
        type: "group",
        label: "Service Catalogue",
        children: [
          { label: "Service Items", href: "/infrastructure/service-items" },
          { label: "Service Library", href: "/infrastructure/service-library" },
          { label: "Service <-> Charge Mapping", href: "/infrastructure/service-mapping" },
          { label: "Service Catalogue", href: "/infrastructure/service-catalogues" },
          { label: "Service Packages", href: "/infrastructure/service-packages" },
          { label: "Order Sets", href: "/infrastructure/order-sets" },
          { label: "Service Availability", href: "/infrastructure/service-availability" },
          { label: "Service Bulk Import", href: "/infrastructure/service-bulk-import" },
        ],
      },
      {
        type: "group",
        label: "Readiness & Ops",
        children: [
          { label: "Fix-It Queue", href: "/infrastructure/fixit" },
          { label: "Go-Live Validator", href: "/infrastructure/golive" },
          { label: "Bulk Import (CSV/XLS)", href: "/infrastructure/import" },
        ],
      },
    ],
  },
  {
    label: "Policy Governance",
    href: "/dashboard/global",
    icon: IconDashboard,
    children: [
      // { label: "Overview", href: "/dashboard/global" },
      
      { label: "Policy Governance", href: "/policy" },
      { label: "Policy Presets", href: "/policy/presets" },
      { label: "Policies", href: "/policy/policies" },
      { label: "Approvals", href: "/policy/approvals" },
      { label: "Audit Trail", href: "/policy/audit" },
      { label: "Access Control", href: "/access" },
    ],
  },
 {
    label: "Regulatory Compliances",
    href: "/compliance",
    icon: IconShield,
    children: [
      { label: "Overview", href: "/compliance" },
      { label: "Workspaces", href: "/compliance/workspaces" },
      { label: "Evidence Vault", href: "/compliance/evidence" },
      { label: "Approvals", href: "/compliance/approvals" },
      { label: "ABDM", href: "/compliance/abdm" },
      { label: "ABHA Config", href: "/compliance/abdm/abha" },
      { label: "HFR Profile", href: "/compliance/abdm/hfr" },
      { label: "HPR Linkage", href: "/compliance/abdm/hpr" },
      { label: "Schemes", href: "/compliance/schemes" },
      { label: "PMJAY", href: "/compliance/schemes/pmjay" },
      { label: "CGHS", href: "/compliance/schemes/cghs" },
      { label: "ECHS", href: "/compliance/schemes/echs" },
      { label: "Mappings", href: "/compliance/schemes/mapping" },
      { label: "NABH", href: "/compliance/nabh" },
      { label: "Checklist", href: "/compliance/nabh/checklist" },
      { label: "Audits", href: "/compliance/nabh/audits" },
      { label: "Validator", href: "/compliance/validator" },
      { label: "Audit Log", href: "/compliance/audit-log" },
      { label: "Consent Manager", href: "/compliance/consent" },
      { label: "Rights (RTBF)", href: "/compliance/rights" },
      { label: "Records Governance", href: "/compliance/records" },
      { label: "Break Glass", href: "/compliance/break-glass" },
    ],
  },

];

const NAV_CARE: NavNode[] = [
  {
    label: "Front Office & QMS",
    href: "/frontoffice",
    icon: IconClipboard,
    children: [
      { label: "Registration (UHID/MPI)", href: "/frontoffice/registration" },
      { label: "Token & Queue Dashboard", href: "/frontoffice/qms" },
      { label: "ABHA Scan & Share", href: "/frontoffice/abha" },
      { label: "Transfers & Audit", href: "/frontoffice/transfers" },
    ],
  },
  {
    label: "Clinical Care",
    href: "/clinical",
    icon: IconStethoscope,
    children: [
      { label: "Clinical Worklist", href: "/clinical/worklist" },
      { label: "OPD Visits", href: "/clinical/opd" },
      { label: "EMR Notes", href: "/clinical/emr-notes" },
      { label: "Orders", href: "/clinical/orders" },
      { label: "Prescriptions", href: "/clinical/prescriptions" },
      { label: "Admissions (IPD)", href: "/clinical/ipd" },
      { label: "OT", href: "/clinical/ot" },
      { label: "ER", href: "/clinical/er" },
    ],
  },
  {
    label: "Nursing & Ward",
    href: "/nursing",
    icon: IconBed,
    children: [
      { label: "Ward Dashboard", href: "/nursing/ward-dashboard" },
      { label: "Bed Board", href: "/nursing/bed-board" },
      { label: "Vitals", href: "/nursing/vitals" },
      { label: "Nursing Notes", href: "/nursing/notes" },
    ],
  },
  {
    label: "Diagnostics (Lab/Imaging)",
    href: "/diagnostics",
    icon: IconFlask,
    children: [
      { label: "Lab Orders", href: "/diagnostics/lab-orders" },
      { label: "Sample Collection", href: "/diagnostics/sample-collection" },
      { label: "Results Validation", href: "/diagnostics/results" },
      { label: "Imaging", href: "/diagnostics/imaging" },
    ],
  },
  {
    label: "Pharmacy & Inventory",
    href: "/pharmacy",
    icon: IconPill,
    children: [
      { label: "Dispensing", href: "/pharmacy/dispensing" },
      { label: "Stock", href: "/pharmacy/stock" },
      { label: "Purchases", href: "/pharmacy/purchases" },
    ],
  },
  {
    label: "Blood Bank",
    href: "/blood-bank",
    icon: IconDroplet,
    children: [
      { label: "Overview", href: "/blood-bank" },
      {
        type: "group",
        label: "Setup & Config",
        children: [
          { label: "Facility Setup", href: "/blood-bank/facility" },
          { label: "Component Types", href: "/blood-bank/components" },
          { label: "Equipment", href: "/blood-bank/equipment" },
          { label: "Reagents", href: "/blood-bank/reagents" },
          { label: "Tariff Config", href: "/blood-bank/tariff" },
        ],
      },
      {
        type: "group",
        label: "Donor & Collection",
        children: [
          { label: "Donor Registry", href: "/blood-bank/donors" },
          { label: "Blood Collection", href: "/blood-bank/collection" },
          { label: "Component Separation", href: "/blood-bank/separation" },
          { label: "Donation Camps", href: "/blood-bank/camps" },
        ],
      },
      {
        type: "group",
        label: "Testing & Inventory",
        children: [
          { label: "Testing Lab", href: "/blood-bank/testing" },
          { label: "Inventory Dashboard", href: "/blood-bank/inventory" },
          { label: "Expiring Units", href: "/blood-bank/inventory/expiring" },
        ],
      },
      {
        type: "group",
        label: "Cross-Match & Issue",
        children: [
          { label: "Blood Requests", href: "/blood-bank/requests" },
          { label: "Cross-Match Workbench", href: "/blood-bank/cross-match" },
          { label: "Issue Desk", href: "/blood-bank/issue" },
          { label: "Transfusion Monitor", href: "/blood-bank/transfusion" },
          { label: "MTP Dashboard", href: "/blood-bank/mtp" },
        ],
      },
      {
        type: "group",
        label: "QC & Reports",
        children: [
          { label: "Quality Control", href: "/blood-bank/qc" },
          { label: "Reports", href: "/blood-bank/reports" },
          { label: "Adverse Reactions", href: "/blood-bank/reactions" },
          { label: "Audit Trail", href: "/blood-bank/audit" },
        ],
      },
    ],
  },
  {
    label: "Billing, Finance & TPA",
    href: "/billing",
    icon: IconReceipt,
    children: [
      { label: "Insurance Policies", href: "/billing/insurance-policies" },
      { label: "Insurance Cases", href: "/billing/insurance-cases" },
      { label: "Pre-authorization", href: "/billing/preauth" },
      { label: "Claims", href: "/billing/claims" },
      { label: "Claims Dashboard", href: "/billing/claims-dashboard" },
      { label: "Reconciliation", href: "/billing/reconciliation" },
      { label: "Insurance Documents", href: "/billing/insurance-documents" },
      { label: "Document Checklists", href: "/billing/document-checklists" },
      { label: "Payer Integrations", href: "/billing/payer-integrations" },
      { label: "Tariffs", href: "/billing/tariffs" },
      { label: "Packages", href: "/billing/packages" },
      { label: "Billing Desk", href: "/billing/billing-desk" },
      { label: "Cashier", href: "/billing/cashier" },
    ],
  },
];

const NAV_GOVERN: NavNode[] = [
  {
    label: "Facilities & Ops",
    href: "/ops",
    icon: IconBuilding,
    children: [
      { label: "Assets & Biomedical", href: "/ops/assets" },
      { label: "Housekeeping", href: "/ops/housekeeping" },
      { label: "IT Requests", href: "/ops/it" },
      { label: "Maintenance", href: "/ops/maintenance" },
    ],
  },
  
  {
    label: "Statutory Reporting",
    href: "/statutory",
    icon: IconChart,
    children: [
      { label: "Nikshay", href: "/statutory/nikshay" },
      { label: "IDSP / IHIP", href: "/statutory/idsp-ihip" },
    ],
  },
  {
    label: "AI Copilot",
    href: "/ai",
    icon: IconBrain,
    children: [
      { label: "Copilot", href: "/ai/copilot" },
      { label: "AI Audit", href: "/ai/audit" },
      { label: "AI Governance", href: "/ai/governance" },
      { label: "Model Registry", href: "/ai/models" },
    ],
  },
  {
    label: "Users & Access",
    href: "/access",
    icon: IconUsers,
    children: [
      { label: "Permissions", href: "/access/permissions" },
      { label: "Roles", href: "/access/roles" },
      { label: "App Users", href: "/access/users" },
      { label: "Audit Trails", href: "/access/audit" },
    ],
  },
];

const NAV_GROUPS: NavGroup[] = [
  { title: "Workspaces", items: NAV_WORKSPACES },
  { title: "Care Delivery", items: NAV_CARE },
  { title: "Governance & Ops", items: NAV_GOVERN },
];
// ----------------------
/* Permission-based Nav Visibility (enterprise RBAC)
   - UI uses permissions (principal.permissions[]) coming from /api/iam/me
   - No role hardcoding for authorization decisions
   - Scope (GLOBAL/BRANCH) still controls which workspace routes exist
*/

function normRole(role?: string | null) {
  const r = String(role ?? "").trim().toUpperCase();
  const map: Record<string, string> = {
    ADMIN: "BRANCH_ADMIN",
    BRANCHADMIN: "BRANCH_ADMIN",
    BRANCH_ADMIN: "BRANCH_ADMIN",
    GLOBAL: "GLOBAL_ADMIN",
    GLOBALADMIN: "GLOBAL_ADMIN",
    GLOBAL_ADMIN: "GLOBAL_ADMIN",
    CORP_ADMIN: "CORPORATE_ADMIN",
    CORPORATE: "CORPORATE_ADMIN",
    SUPER: "SUPER_ADMIN",
  };

  return map[r] ?? r;
}

function inferScopeFromUser(user: any): "GLOBAL" | "BRANCH" {
  const s = resolveRoleScope(user);
  return s === "BRANCH" ? "BRANCH" : "GLOBAL";
}

function getUserPerms(user: any): string[] | null {
  const perms = user?.permissions;
  if (!Array.isArray(perms)) return null;
  return perms.filter((p: any) => typeof p === "string" && p.length > 0);
}

function hasAnyPrefix(perms: string[], prefixes: string[]) {
  if (!prefixes.length) return true;
  return perms.some((p) => prefixes.some((pre) => p.startsWith(pre)));
}

type NavCtx = {
  scope: "GLOBAL" | "BRANCH";
  perms: string[] | null; // null => not loaded/unknown
  isSuperAdmin?: boolean;
};

/**
 * Route → permission prefix rules.
 * Used for:
 * - Sidebar visibility
 * - Command Center filtering
 * - Lightweight client-side guard (defense in depth; backend is still the authority)
 *
 * IMPORTANT: Prefix lists should be broad enough to avoid accidental lockouts,
 * but strict enough that "unknown routes" under a module root don't default-allow.
 */
const ROUTE_RULES: Array<{ root: string; anyPrefixes: string[] }> = [
  // Governance / admin surfaces
  { root: "/access", anyPrefixes: ["IAM_", "ACCESS_"] },
  { root: "/policy", anyPrefixes: ["POLICY_", "GOV_", "AUDIT_", "IAM_"] },
  { root: "/branches", anyPrefixes: ["ORG_", "BRANCH_", "IAM_"] },
  // { root: "/users", anyPrefixes: ["IAM_USER_", "IAM_", "ORG_"] },
  { root: "/dashboard/global", anyPrefixes: ["ORG_", "BRANCH_", "IAM_", "REPORT_", "ANALYTICS_", "DASHBOARD_"] },
  {
    root: "/infrastructure",
    anyPrefixes: [
      "INFRA_",
      "STAFF_",
      "SERVICE_",
      "CATALOG_",
      "ORDERSET_",
      "TARIFF_",
      "CHARGE_",
      "TAX_",
      "BILLING_SETUP_",
      "BILLING_",
    ],
  },

  // Care delivery modules (broad now; tighten later as you add explicit perms)
  { root: "/frontoffice", anyPrefixes: ["FO_", "FRONT_OFFICE_", "REG_", "QMS_", "ACCESS_", "IAM_"] },
  { root: "/clinical", anyPrefixes: ["CLIN_", "EMR_", "OPD_", "IPD_", "ADT_", "ORDER_", "RX_", "PRESC_", "ACCESS_", "IAM_"] },
  { root: "/nursing", anyPrefixes: ["NURS_", "WARD_", "IPD_", "ACCESS_", "IAM_"] },
  { root: "/diagnostics", anyPrefixes: ["DIAG_", "LAB_", "IMAGING_", "ACCESS_", "IAM_"] },
  { root: "/pharmacy", anyPrefixes: ["PHARM_", "INVENTORY_", "STOCK_", "PURCHASE_", "ACCESS_", "IAM_"] },
  { root: "/billing", anyPrefixes: ["BILLING_", "FIN_", "TPA_", "ACCESS_", "IAM_"] },
  { root: "/blood-bank", anyPrefixes: ["BB_", "ACCESS_", "IAM_"] },

  // Ops / compliance / AI
  { root: "/ops", anyPrefixes: ["OPS_", "FACILITY_", "MAINT_", "IT_", "HOUSEKEEP_", "ACCESS_", "IAM_"] },
  { root: "/compliance", anyPrefixes: ["COMPLIANCE_", "CONSENT_", "DPDP_", "AUDIT_", "GOV_", "ACCESS_", "IAM_"] },
  { root: "/statutory", anyPrefixes: ["STATUTORY_", "REPORT_", "REG_", "ACCESS_", "IAM_"] },
  { root: "/ai", anyPrefixes: ["AI_", "ACCESS_", "IAM_"] },
];

// Order rules by specificity so "/dashboard/global" matches before "/dashboard"
const ROUTE_RULES_SORTED = [...ROUTE_RULES].sort((a, b) => b.root.length - a.root.length);

function matchRouteRule(href: string) {
  return ROUTE_RULES_SORTED.find((r) => href === r.root || href.startsWith(`${r.root}/`)) ?? null;
}

// Module roots we consider "RBAC-controlled". Unknown paths under these should not default-allow once perms are loaded.
const KNOWN_MODULE_ROOTS = ROUTE_RULES.map((r) => r.root);

function isUnderKnownModuleRoot(href: string) {
  return KNOWN_MODULE_ROOTS.some((root) => href === root || href.startsWith(`${root}/`));
}

/**
 * Central policy for which routes appear in the sidebar / command center.
 * IMPORTANT: This does not replace backend authorization.
 *
 * Strategy:
 * - Scope gates are always applied (GLOBAL/BRANCH workspace split).
 * - If permissions are not yet loaded, we allow links by scope (prevents blank nav on first paint).
 * - Once permissions are loaded, module roots become permission-driven and "unknown routes" under them do not default-allow.
 */
function allowHrefByPerm(href: string, ctx: NavCtx) {
  const { scope, perms } = ctx;
  if (ctx.isSuperAdmin) return true;

  // Always allow core landing pages
  if (href === "/welcome" || href === "/dashboard") return true;

  // Scope gates (GLOBAL-only areas)
  if (
    href.startsWith("/access") ||
    href.startsWith("/policy") ||
    href.startsWith("/branches") ||
    href.startsWith("/dashboard/global")
  ) {
    if (scope !== "GLOBAL") return false;
  }

  // Legacy branch workspace (kept for backward compatibility)
  if (href.startsWith("/admin")) {
    if (scope !== "BRANCH") return false;
  }

  // If permissions are not loaded yet, do not over-restrict UI (scope gates already applied).
  if (!perms) return true;

  const rule = matchRouteRule(href);
  if (rule) return hasAnyPrefix(perms, rule.anyPrefixes);

  // If we are under any known module root but have no explicit rule (should not happen), deny by default.
  if (isUnderKnownModuleRoot(href)) return false;

  // Non-module pages default-allow (backend will still guard sensitive actions)
  return true;
}


function rewriteHref(label: string, href: string, _ctx: { scope: "GLOBAL" | "BRANCH" }) {
  // Fix “App Users” link so GLOBAL users land on the corporate user screen
  if (label === "App Users") return "/access/users";
  return href;
}

function filterNavGroupsForUser(groups: NavGroup[], user: any): NavGroup[] {
  const scope = inferScopeFromUser(user);
  const perms = getUserPerms(user);
  const roleCode = normRole(user?.roleCode ?? user?.role);
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const ctx: NavCtx = { scope, perms, isSuperAdmin };

  // Keep your existing UX:
  // - Admin personas see Workspaces first and hide Care Delivery.
  // - Clinical personas hide Workspaces to keep the menu clean.
  const persona: "ADMIN" | "CLINICAL" | "UNKNOWN" = !perms
    ? "UNKNOWN"
    : hasAnyPrefix(perms, ["IAM_", "INFRA_", "STAFF_", "POLICY_", "ORG_", "BRANCH_", "ACCESS_"])
      ? "ADMIN"
      : "CLINICAL";

  const allowedGroupTitle = (title: string) => {
    // During first paint (before /api/iam/me has hydrated permissions), avoid hiding groups.
    if (persona === "UNKNOWN") return true;

    if (persona === "ADMIN") {
      if (title === "Workspaces") return true;
      if (title === "Governance & Ops") return true;
      if (title === "Care Delivery" && isSuperAdmin) return true;
      return false; // hide Care Delivery for admin personas
    }

    // Clinical personas: hide admin workspace group
    if (title === "Workspaces") return false;
    return true;
  };

  const out: NavGroup[] = [];

  for (const g of groups) {
    if (!allowedGroupTitle(g.title)) continue;

    const items: NavNode[] = [];

    for (const n of g.items) {
      const nodeHrefAllowed = allowHrefByPerm(n.href, ctx);

      // Filter children
      let nextChildren: NavChild[] | undefined = undefined;

      if (n.children?.length) {
        const kept: NavChild[] = [];

        for (const child of n.children) {
          if (isChildGroup(child)) {
            const groupChildren = child.children
              .map((c) => ({ ...c, href: rewriteHref(c.label, c.href, { scope }) }))
              .filter((c) => allowHrefByPerm(c.href, ctx));

            if (groupChildren.length) kept.push({ ...child, children: groupChildren });
          } else {
            const updated = { ...child, href: rewriteHref(child.label, child.href, { scope }) };
            if (allowHrefByPerm(updated.href, ctx)) kept.push(updated);
          }
        }

        if (kept.length) nextChildren = kept;
      }

      // Keep the node if:
      // - it’s allowed directly, OR
      // - it has at least one allowed child
      if (!nodeHrefAllowed && (!nextChildren || nextChildren.length === 0)) continue;

      items.push({ ...n, children: nextChildren });
    }

    if (items.length) out.push({ ...g, items });
  }

  return out;
}

// --- Command Center Types ---
type CommandItem = {
  id: string;
  label: string;
  group: string;
  icon: React.ComponentType<IconProps>;
  subtitle?: string;
  keywords?: string[];
  href?: string;
  onSelect?: () => void;
};

const COMMAND_ACTIONS: CommandItem[] = [
  {
    id: "action:create-branch",
    label: "Create Branch",
    group: "Actions",
    icon: IconPlus,
    subtitle: "Open branch create form",
    keywords: ["branch", "create", "new"],
    href: "/branches?create=1",
  },
  {
    id: "action:open-branches",
    label: "Open Branches",
    group: "Actions",
    icon: IconBuilding,
    subtitle: "Branch registry and setup",
    keywords: ["branches", "registry"],
    href: "/branches",
  },
  {
    id: "action:open-diagnostics",
    label: "Diagnostics Configuration",
    group: "Actions",
    icon: IconFlask,
    subtitle: "Packs, catalog, templates",
    keywords: ["diagnostics", "lab", "imaging"],
    href: "/infrastructure/diagnostics",
  },
  {
    id: "action:open-policy-presets",
    label: "Policy Presets",
    group: "Actions",
    icon: IconShield,
    subtitle: "Install governance packs",
    keywords: ["policy", "presets", "governance"],
    href: "/policy/presets",
  },
];

// --- Command Center Helpers ---

function isChildGroup(child: NavChild): child is NavChildGroup {
  return (child as NavChildGroup).type === "group";
}

function flattenChildLinks(children?: NavChild[]) {
  const links: Array<{ link: NavChildLink; groupLabel?: string }> = [];
  if (!children?.length) return links;
  for (const child of children) {
    if (isChildGroup(child)) {
      child.children.forEach((link) => links.push({ link, groupLabel: child.label }));
    } else {
      links.push({ link: child });
    }
  }
  return links;
}

// --- Helpers ---

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavNodeActive(pathname: string, node: NavNode) {
  if (!node.children?.length) return isActivePath(pathname, node.href);
  if (pathname === node.href) return true;
  return flattenChildLinks(node.children).some(({ link }) => isActivePath(pathname, link.href));
}

function getActiveChildHref(pathname: string, children?: NavChild[], parentHref?: string): string | null {
  const links = flattenChildLinks(children);
  let best: { href: string; len: number } | null = null;
  for (const { link } of links) {
    const href = link.href;
    const matches = href === parentHref ? pathname === href : isActivePath(pathname, href);
    if (!matches) continue;
    const len = href.length;
    if (!best || len > best.len) best = { href, len };
  }
  return best?.href ?? null;
}

function readBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore
  }
}

const SIDEBAR_SCROLL_KEY = "zc.sidebarScrollTop";

function NavBadge({ badge }: { badge?: NavBadgeDef }) {
  if (!badge) return null;
  const tone = badge.tone ?? "neutral";
  const cls =
    tone === "new"
      ? "border-zc-accent/40 bg-zc-accent/15 text-zc-accent"
      : tone === "soon"
        ? "border-zc-border/80 bg-[rgb(var(--zc-hover-rgb)/0.04)] text-zc-muted"
        : "border-zc-border/80 bg-[rgb(var(--zc-hover-rgb)/0.04)] text-zc-muted";

  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cls
      )}
    >
      {badge.label}
    </span>
  );
}

// --- Component ---

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function AppShell({
  title,
  children,
  breadcrumbs,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const authzReady = Array.isArray((user as any)?.permissions);
  const logout = useAuthStore((s) => s.logout);
  const handleLogout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network failures; still logout locally
    } finally {
      logout();
      router.replace("/login" as any);
    }
  }, [logout, router]);

  const [refreshing, setRefreshing] = React.useState(false);

  const globalRefresh = React.useCallback(
    (opts?: GlobalRefreshOptions) => {
      if (opts?.hard) {
        if (typeof window !== "undefined") window.location.reload();
        return;
      }

      setRefreshing(true);
      try {
        router.refresh();
      } finally {
        if (typeof window !== "undefined") {
          window.setTimeout(() => setRefreshing(false), 500);
        } else {
          setRefreshing(false);
        }
      }
    },
    [router]
  );

  const scope = resolveRoleScope(user);
  const isGlobalScope = scope === "GLOBAL";

  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);

  // Header branch selector visibility (keep earlier rule)
  const userPermsForHeader = getUserPerms(user);
  const canShowBranchSelector =
    authzReady && isGlobalScope && (!userPermsForHeader || hasAnyPrefix(userPermsForHeader, ["BRANCH_", "ORG_"]));

  // Branch-required UX (central)
  const [branchGateOpen, setBranchGateOpen] = React.useState(false);
  const [branchGateNext, setBranchGateNext] = React.useState<string | null>(null);
  const branchGateNotifiedRef = React.useRef(false);

  const requiresBranchForPath = React.useMemo(() => {
    if (!isGlobalScope) return false;
    if (!pathname) return false;

    // Pages that never require an active branch
    const noBranch = [
      "/welcome",
      "/dashboard",
      "/dashboard/global",
      "/branches",
      "/policy",
      "/access",
      "/profile",
      "/settings",
    ];
    if (noBranch.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;

    // Everything below is branch-contextual (safe default)
    const branchScopedRoots = [
      "/infrastructure",
      "/frontoffice",
      "/clinical",
      "/nursing",
      "/diagnostics",
      "/pharmacy",
      "/billing",
      "/blood-bank",
      "/ops",
      "/compliance",
      "/statutory",
      "/ai",
    ];
    return branchScopedRoots.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }, [isGlobalScope, pathname]);

  React.useEffect(() => {
    if (!isGlobalScope) return;
    if (!authzReady) return;

    if (requiresBranchForPath && !activeBranchId) {
      // Save where user wanted to go, then move them to welcome.
      setBranchGateNext((prev) => prev ?? pathname);

      if (!branchGateNotifiedRef.current) {
        branchGateNotifiedRef.current = true;
        toast({
          variant: "warning",
          title: "Active branch required",
          description: "Select a branch to continue.",
        });
      }

      setBranchGateOpen(true);

      if (pathname !== "/welcome") {
        router.replace("/welcome" as any);
      }
      return;
    }

    // If branch selected, close gate and resume navigation once.
    if (activeBranchId && branchGateOpen) {
      setBranchGateOpen(false);
      branchGateNotifiedRef.current = false;

      if (branchGateNext && branchGateNext !== "/welcome" && branchGateNext !== pathname) {
        router.replace(branchGateNext as any);
      }
      setBranchGateNext(null);
    }
  }, [isGlobalScope, requiresBranchForPath, activeBranchId, branchGateOpen, branchGateNext, pathname, router]);

  React.useEffect(() => {
    initActiveBranchSync();
  }, []);

  // Role-based navigation filtering (single menu with role-aware visibility)
  const navGroupsForUser = React.useMemo<NavGroup[]>(() => {
    return filterNavGroupsForUser(NAV_GROUPS, user);
  }, [user]);

  // Guard: keep users inside their workspace (defense-in-depth; proxy/middleware should also enforce this)
  React.useEffect(() => {
    if (!scope || !pathname) return;
    if (!authzReady) return;

    const perms = getUserPerms(user);
    const navCtx: NavCtx = {
      scope: inferScopeFromUser(user),
      perms,
      isSuperAdmin: normRole(user?.roleCode ?? user?.role) === "SUPER_ADMIN",
    };

    // BRANCH users: never allow GLOBAL-only workspaces
    if (
      scope === "BRANCH" &&
      (pathname.startsWith("/access") ||
        pathname.startsWith("/policy") ||
        pathname.startsWith("/branches") ||
        pathname.startsWith("/dashboard/global") ||
        pathname.startsWith("/superadmin"))
    ) {
      router.replace("/welcome" as any);
      return;
    }

    // GLOBAL users: avoid /admin workspace
    if (scope === "GLOBAL" && pathname.startsWith("/admin")) {
      router.replace("/welcome" as any);
      return;
    }

    // If permissions are known and the current route is not allowed, bounce to welcome.
    // (Backend remains the true authority.)
    if (!allowHrefByPerm(pathname, navCtx)) {
      router.replace("/welcome" as any);
    }
  }, [scope, pathname, router, user]);


  // Initialize state
  const [collapsed, setCollapsed] = React.useState(false);
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  const [groupOpenMap, setGroupOpenMap] = React.useState<Record<string, boolean>>({});
  const [navQuery, setNavQuery] = React.useState("");
  const sidebarNavRef = React.useRef<HTMLElement | null>(null);
  const sidebarScrollRafRef = React.useRef<number | null>(null);

  // Command Center State
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");
  const [commandIndex, setCommandIndex] = React.useState(0);
  const [recentCommandIds, setRecentCommandIds] = React.useState<string[]>([]);

  // Hydrate state from local storage on mount
  React.useEffect(() => {
    setCollapsed(readBool("zc.sidebarCollapsed", false));
    setOpenMap(readJSON<Record<string, boolean>>("zc.sidebarOpenMap", {}));
    setGroupOpenMap(
      readJSON<Record<string, boolean>>("zc.sidebarGroupOpenMap", {
        Workspaces: true,
        "Care Delivery": true,
        "Governance & Ops": true,
      })
    );
  }, []);

  // Keyboard Shortcut Effect (Ctrl+K / Cmd+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (commandOpen) {
      setCommandQuery("");
      setCommandIndex(0);
      setRecentCommandIds(readJSON<string[]>("zc.command.recent", []));
    }
  }, [commandOpen]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      writeBool("zc.sidebarCollapsed", next);
      return next;
    });
  }

  function toggleOpen(key: string) {
    setOpenMap((m) => {
      const next = { ...m, [key]: !(m[key] ?? true) };
      writeJSON("zc.sidebarOpenMap", next);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setGroupOpenMap((m) => {
      const next = { ...m, [key]: !(m[key] ?? true) };
      writeJSON("zc.sidebarGroupOpenMap", next);
      return next;
    });
  }

  const persistSidebarScroll = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (sidebarScrollRafRef.current !== null) return;

    sidebarScrollRafRef.current = window.requestAnimationFrame(() => {
      sidebarScrollRafRef.current = null;
      const el = sidebarNavRef.current;
      if (!el) return;
      writeJSON(SIDEBAR_SCROLL_KEY, el.scrollTop);
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      if (sidebarScrollRafRef.current !== null) {
        window.cancelAnimationFrame(sidebarScrollRafRef.current);
        sidebarScrollRafRef.current = null;
      }
      const el = sidebarNavRef.current;
      if (!el) return;
      writeJSON(SIDEBAR_SCROLL_KEY, el.scrollTop);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.requestAnimationFrame(() => {
      const savedTop = readJSON<number>(SIDEBAR_SCROLL_KEY, 0);
      if (!Number.isFinite(savedTop) || savedTop <= 0) return;
      if (sidebarNavRef.current) sidebarNavRef.current.scrollTop = savedTop;
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname, collapsed]);

  const roleCommandActions = React.useMemo<CommandItem[]>(() => {
    const scope = inferScopeFromUser(user);
    const perms = getUserPerms(user);
    const ctx: NavCtx = { scope, perms, isSuperAdmin: normRole(user?.roleCode ?? user?.role) === "SUPER_ADMIN" };

    return COMMAND_ACTIONS
      .map((a) => ({
        ...a,
        href: a.href ? rewriteHref(a.label, a.href, { scope }) : a.href,
      }))
      .filter((a) => !a.href || allowHrefByPerm(a.href, ctx));
  }, [user]);


  const allNavItems = React.useMemo(() => buildAllNavItems(navGroupsForUser), [navGroupsForUser]);

  // Command Center helpers
  const commandNavItems = React.useMemo<CommandItem[]>(() => {
    const scope = inferScopeFromUser(user);
    const perms = getUserPerms(user);
    const ctx: NavCtx = { scope, perms, isSuperAdmin: normRole(user?.roleCode ?? user?.role) === "SUPER_ADMIN" };

    return allNavItems
      .map((item) => ({ ...item, href: rewriteHref(item.label, item.href, { scope }) }))
      .filter((item) => allowHrefByPerm(item.href, ctx))
      .map((item) => ({
        id: `nav:${item.href}`,
        label: item.label,
        group: item.group,
        icon: item.icon,
        subtitle: item.parent ? `${item.parent} • ${item.group}` : item.group,
        keywords: [item.parent, item.group, item.label].filter(Boolean) as string[],
        href: item.href,
      }));
  }, [user, allNavItems]);



  const commandItems = React.useMemo<CommandItem[]>(() => [...roleCommandActions, ...commandNavItems], [roleCommandActions, commandNavItems]);

  function recordRecentCommand(id: string) {
    const next = [id, ...recentCommandIds.filter((x) => x !== id)].slice(0, 6);
    setRecentCommandIds(next);
    writeJSON("zc.command.recent", next);
  }

  function scoreCommand(item: CommandItem, q: string) {
    const query = q.trim().toLowerCase();
    if (!query) return 0;
    const hay = `${item.label} ${item.subtitle ?? ""} ${(item.keywords || []).join(" ")}`.toLowerCase();
    if (hay.startsWith(query)) return 120;
    if (hay.includes(query)) return 80;
    // fuzzy-ish: count ordered character matches
    let score = 0;
    let qi = 0;
    for (let i = 0; i < hay.length && qi < query.length; i++) {
      if (hay[i] === query[qi]) {
        score += 2;
        qi += 1;
      }
    }
    return qi === query.length ? score : 0;
  }

  const filteredCommandItems = React.useMemo(() => {
    const q = commandQuery.trim();
    if (!q) return [] as CommandItem[];
    return commandItems
      .map((item) => ({ item, score: scoreCommand(item, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item)
      .slice(0, 12);
  }, [commandItems, commandQuery]);

  const recentCommandItems = React.useMemo(() => {
    if (!recentCommandIds.length) return [] as CommandItem[];
    const map = new Map(commandItems.map((i) => [i.id, i]));
    return recentCommandIds.map((id) => map.get(id)).filter(Boolean) as CommandItem[];
  }, [commandItems, recentCommandIds]);

  const suggestedCommandItems = React.useMemo(() => {
    const topNavParents = commandNavItems.filter((i) => i.subtitle?.includes("Workspaces") || i.subtitle?.includes("Care Delivery")).slice(0, 6);
    return [...roleCommandActions, ...topNavParents].slice(0, 8);
  }, [commandNavItems, roleCommandActions]);

  const commandSections = React.useMemo(() => {
    if (commandQuery.trim()) {
      return [{ title: "Results", items: filteredCommandItems }];
    }
    const sections: Array<{ title: string; items: CommandItem[] }> = [];
    if (recentCommandItems.length) sections.push({ title: "Recent", items: recentCommandItems });
    if (roleCommandActions.length) sections.push({ title: "Actions", items: roleCommandActions });
    sections.push({ title: "Navigation", items: suggestedCommandItems });
    return sections;
  }, [commandQuery, filteredCommandItems, recentCommandItems, suggestedCommandItems, roleCommandActions]);

  const flatCommandItems = React.useMemo(
    () => commandSections.flatMap((s) => s.items),
    [commandSections]
  );

  React.useEffect(() => {
    if (!commandOpen) return;
    setCommandIndex(0);
  }, [commandQuery, commandOpen, flatCommandItems.length]);

  function executeCommand(item: CommandItem) {
    if (item.onSelect) item.onSelect();
    if (item.href) router.push(item.href as any);
    recordRecentCommand(item.id);
    setCommandOpen(false);
    setCommandQuery("");
  }

  const visibleGroups = React.useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return navGroupsForUser;

    const filtered: NavGroup[] = [];
    for (const g of navGroupsForUser) {
      const items: NavNode[] = [];
      for (const n of g.items) {
        const selfMatch = n.label.toLowerCase().includes(q) || n.href.toLowerCase().includes(q);
        const filteredChildren: NavChild[] = [];
        for (const child of n.children ?? []) {
          if (isChildGroup(child)) {
            const groupMatch = child.label.toLowerCase().includes(q);
            const groupChildren = child.children.filter((c) =>
              (c.label + " " + c.href).toLowerCase().includes(q)
            );
            if (groupMatch) {
              filteredChildren.push(child);
            } else if (groupChildren.length) {
              filteredChildren.push({ ...child, children: groupChildren });
            }
          } else if ((child.label + " " + child.href).toLowerCase().includes(q)) {
            filteredChildren.push(child);
          }
        }

        if (!selfMatch && filteredChildren.length === 0) continue;
        items.push({ ...n, children: selfMatch ? n.children : filteredChildren });
      }
      if (items.length) filtered.push({ ...g, items });
    }
    return filtered;
  }, [navQuery, navGroupsForUser]);


  const sidebarW = collapsed ? "w-[72px]" : "w-[280px]";
  const rowHover = "hover:bg-[rgb(var(--zc-hover-rgb)/0.06)]";
  const rowActive = "bg-[rgb(var(--zc-hover-rgb)/0.10)]";

  if (!authzReady) {
    const pulse = "animate-pulse bg-[rgb(var(--zc-hover-rgb)/0.10)]";
    return (
      <GlobalRefreshContext.Provider value={globalRefresh}>
        <div className="h-screen overflow-hidden bg-zc-bg text-zc-text">
          <div className="flex h-full">
            <aside
              className={cn(
                "shrink-0 border-r border-zc-border bg-white/60 dark:bg-zinc-950/30",
                sidebarW
              )}
            >
              <div className="h-14 px-4 flex items-center gap-3 border-b border-zc-border">
                <div className={cn("h-7 w-7 rounded-md", pulse)} />
                {!collapsed ? <div className={cn("h-4 w-28 rounded", pulse)} /> : null}
              </div>
              <div className="p-3 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-9 rounded-md",
                      pulse,
                      collapsed ? "mx-auto w-10" : "w-full"
                    )}
                  />
                ))}
              </div>
            </aside>

            <div className="flex-1 flex flex-col">
              <header className="h-14 border-b border-zc-border flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-md", pulse)} />
                  <div className={cn("h-4 w-56 rounded", pulse)} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-28 rounded-md", pulse)} />
                  <div className={cn("h-8 w-8 rounded-md", pulse)} />
                </div>
              </header>

              <main className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl space-y-4">
                  <div className={cn("h-8 w-64 rounded", pulse)} />
                  <div className={cn("h-4 w-96 rounded", pulse)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-28 rounded-xl border border-zc-border bg-white/50 dark:bg-zinc-950/20",
                          "animate-pulse"
                        )}
                      />
                    ))}
                  </div>
                  <div className="pt-4 text-xs text-zc-muted">
                    Loading access rights…
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </GlobalRefreshContext.Provider>
    );
  }

  return (
    <GlobalRefreshContext.Provider value={globalRefresh}>
    <CopilotProvider>
      <div className="h-screen overflow-hidden bg-zc-bg text-zc-text">
        {/* Command Center Dialog */}
        <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
          <DialogContent className="p-0 gap-0 overflow-hidden max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl sm:rounded-xl [&>button]:hidden">
            <DialogTitle className="sr-only">Command Center</DialogTitle>
            <div className="flex items-center h-14 border-b border-zinc-200 dark:border-zinc-800 px-4">
              <IconSearch className="mr-3 h-5 w-5 shrink-0 text-zinc-400" />
              <input
                className="flex h-full w-full bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-0"
                placeholder="Type a command, page, or action..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (!flatCommandItems.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCommandIndex((i) => (i + 1) % flatCommandItems.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCommandIndex((i) => (i - 1 + flatCommandItems.length) % flatCommandItems.length);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const item = flatCommandItems[commandIndex];
                    if (item) executeCommand(item);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setCommandOpen(false);
                  }
                }}
                autoFocus
                autoComplete="off"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {!commandQuery && commandSections.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-500">
                  <IconKeyboard className="mx-auto h-8 w-8 mb-3 opacity-50" />
                  <p>Start typing to search apps, pages, and actions.</p>
                </div>
              ) : null}

              {commandQuery && filteredCommandItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-zinc-500">
                  No results found for "{commandQuery}"
                </div>
              ) : null}

              {(() => {
                let runningIndex = -1;
                return commandSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <h4 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {section.title}
                    </h4>
                    {section.items.map((item) => {
                      runningIndex += 1;
                      const active = runningIndex === commandIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => executeCommand(item)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                            active
                              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-100"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                            <item.icon className="h-4 w-4 text-zinc-500" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium truncate">{item.label}</span>
                            {item.subtitle ? (
                              <span className="text-xs text-zinc-400 truncate">{item.subtitle}</span>
                            ) : null}
                          </div>
                          <IconChevronRight className={cn("h-4 w-4 text-zinc-400", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-2.5 text-[10px] text-zinc-500">
              <div>↑/↓ to navigate • Enter to open</div>
              <div>Zypocare Command Center</div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Branch Required Dialog */}
        <Dialog open={branchGateOpen} onOpenChange={setBranchGateOpen}>
          <DialogContent className="max-w-md bg-zc-card border border-zc-border shadow-xl sm:rounded-xl">
            <DialogTitle className="text-base font-semibold text-zc-text">Select Active Branch</DialogTitle>

            <div className="mt-1 text-sm text-zc-muted">
              This page needs a branch context. Choose an active branch to continue.
            </div>

            <div className="mt-4">
              {/* Always show selector here (even if header hides it) */}
              <BranchSelector className="w-full" />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/branches" as any)}
              >
                Manage Branches
              </Button>

              <Button
                variant="primary"
                onClick={() => setBranchGateOpen(false)}
                disabled={!activeBranchId}
              >
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex h-screen min-w-0">
          {/* Sidebar */}
          <aside
            className={cn(
              "hidden lg:flex h-screen flex-col",
              sidebarW,
              "shrink-0 border-r border-zc-border bg-zc-panel transition-[width] duration-300 ease-in-out", // Added smooth width transition
              "overflow-x-hidden"
            )}
          >
            {/* Top Header (Unified) */}
            <div className={cn("shrink-0 relative", collapsed ? "p-3" : "p-4")}>
              <div
                className={cn(
                  "flex items-center",
                  collapsed ? "flex-col justify-center gap-4" : "justify-between"
                )}
              >
                {/* Brand Section */}
                <div
                  className={cn(
                    "flex items-center gap-3 overflow-hidden transition-all duration-300",
                    collapsed ? "justify-center" : ""
                  )}
                >
                  {collapsed ? (
                    <BrandLogo className="h-8 w-[64px]" />
                  ) : (
                    <div className="flex min-w-0 flex-col">
                      <BrandLogo className="h-8 w-[170px]" />
                      {/* <div className="mt-1 truncate text-xs text-zc-muted">
                        {user ? roleLabel(user) : "SUPER ADMIN"}
                      </div> */}
                    </div>
                  )}
                </div>

                {/* Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 text-muted-foreground", collapsed ? "" : "shrink-0")}
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <IconPanelRight className="h-4 w-4" />
                  ) : (
                    <IconPanelLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Sidebar Search */}
            {!collapsed ? (
              <div className="shrink-0 px-4 pb-3">
                {/* Sidebar search removed as per new clean look, kept minimal */}
              </div>
            ) : (
              <div className="shrink-0 px-3 pb-3">
                <Separator className="bg-zc-border" />
              </div>
            )}

            {/* Navigation Items */}
            <nav
              ref={sidebarNavRef}
              onScroll={persistSidebarScroll}
              className={cn(
                "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
                collapsed ? "px-2 pb-4" : "px-3 pb-4",
                "zc-scroll-no-track"
              )}
            >
              <div className={cn("grid", collapsed ? "gap-7" : "gap-6")}>
                {visibleGroups.map((group) => {
                  const groupOpen = navQuery.trim() ? true : (groupOpenMap[group.title] ?? true);

                  return (
                    <div key={group.title} className="grid gap-2">
                      {!collapsed && (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.title)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5",
                            "text-[11px] font-semibold uppercase tracking-wide text-zc-muted",
                            "hover:text-zc-text",
                            rowHover,
                            "transition"
                          )}
                        >
                          {groupOpen ? (
                            <IconChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <IconChevronRight className="h-3.5 w-3.5" />
                          )}
                          <span className="truncate">{group.title}</span>
                        </button>
                      )}

                      <div
                        className={cn(
                          "grid",
                          collapsed ? "gap-3" : "gap-1",
                          !collapsed && !groupOpen ? "hidden" : "block"
                        )}
                      >
                        {group.items.map((node) => {
                          const Icon = node.icon;
                          const active = isNavNodeActive(pathname, node);
                          const open = !collapsed && (openMap[node.href] ?? true);
                          const activeChildHref = node.children?.length
                            ? getActiveChildHref(pathname, node.children, node.href)
                            : null;

                          const linkBase = cn(
                            "group flex min-w-0 items-center gap-3 rounded-lg",
                            collapsed ? "px-0 py-3 justify-center" : "px-3 py-2",
                            "text-sm font-medium transition-colors duration-200",
                            rowHover
                          );

                          return (
                            <div key={node.href} className="min-w-0">
                              <div className="relative">
                                <Link
                                  href={node.href as any}
                                  title={collapsed ? node.label : undefined}
                                  className={cn(linkBase, active ? rowActive : "")}
                                  aria-current={active ? "page" : undefined}
                                >
                                  <Icon
                                    className={cn(
                                      collapsed ? "h-6 w-6 shrink-0 transition-colors" : "h-4 w-4 shrink-0 transition-colors",
                                      active
                                        ? "text-zc-accent"
                                        : "text-zc-muted group-hover:text-zc-text"
                                    )}
                                  />

                                  {!collapsed && (
                                    <span
                                      className={cn(
                                        "min-w-0 flex-1 truncate transition-colors",
                                        active ? "text-zc-text" : "text-zc-text/90"
                                      )}
                                    >
                                      {node.label}
                                    </span>
                                  )}

                                  {!collapsed && <NavBadge badge={node.badge} />}
                                </Link>

                                {!collapsed && node.children?.length ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      "absolute right-2 top-1/2 -translate-y-1/2",
                                      "grid h-7 w-7 place-items-center rounded-md",
                                      "text-zc-muted",
                                      rowHover,
                                      "transition-colors"
                                    )}
                                    aria-label={open ? "Collapse section" : "Expand section"}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleOpen(node.href);
                                    }}
                                  >
                                    {open ? (
                                      <IconChevronDown className="h-4 w-4" />
                                    ) : (
                                      <IconChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : null}
                              </div>

                              {!collapsed && node.children?.length && open ? (
                                <div className="mt-1 grid gap-2 pl-9 animate-in slide-in-from-top-1 duration-200">
                                  {node.children.map((c) => {
                                    if (isChildGroup(c)) {
                                      return (
                                        <div key={`group-${c.label}`} className="grid gap-1">
                                          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zc-muted">
                                            {c.label}
                                          </div>
                                          {c.children.map((child) => {
                                            const childActive = activeChildHref === child.href;
                                            return (
                                              <Link
                                                key={child.href}
                                                href={child.href as any}
                                                className={cn(
                                                  "group flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors",
                                                  childActive ? rowActive : "",
                                                  rowHover
                                                )}
                                                aria-current={childActive ? "page" : undefined}
                                              >
                                                <span
                                                  className={cn(
                                                    "h-1.5 w-1.5 rounded-full transition-colors",
                                                    childActive ? "bg-zc-accent" : "bg-zc-border"
                                                  )}
                                                />
                                                <span
                                                  className={cn(
                                                    "min-w-0 flex-1 truncate transition-colors",
                                                    childActive
                                                      ? "text-zc-text"
                                                      : "text-zc-muted group-hover:text-zc-text"
                                                  )}
                                                >
                                                  {child.label}
                                                </span>
                                                <NavBadgeAI href={child.href as any} />
                                                <NavBadge badge={child.badge} />
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      );
                                    }

                                    const childActive = activeChildHref === c.href;
                                    return (
                                      <Link
                                        key={c.href}
                                        href={c.href as any}
                                        className={cn(
                                          "group flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors",
                                          childActive ? rowActive : "",
                                          rowHover
                                        )}
                                        aria-current={childActive ? "page" : undefined}
                                      >
                                        <span
                                          className={cn(
                                            "h-1.5 w-1.5 rounded-full transition-colors",
                                            childActive ? "bg-zc-accent" : "bg-zc-border"
                                          )}
                                        />
                                        <span
                                          className={cn(
                                            "min-w-0 flex-1 truncate transition-colors",
                                            childActive ? "text-zc-text" : "text-zc-muted group-hover:text-zc-text"
                                          )}
                                        >
                                          {c.label}
                                        </span>
                                        <NavBadgeAI href={c.href as any} />
                                        <NavBadge badge={c.badge} />
                                      </Link>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>

            {/* Bottom Footer */}
            <div className={cn("shrink-0 border-t border-zc-border", collapsed ? "p-3" : "p-4")}>
              <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                {!collapsed ? (
                  <>
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-zc-card border border-zc-border text-xs font-semibold">
                      {(user?.name || "ZypoCare")
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {user?.name ?? "Super Admin"}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-zc-muted">
                        ZypoCare Hospital • Bengaluru
                      </div>
                    </div>
                  </>
                ) : null}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                  className="rounded-full"
                >
                  <IconLogout className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1 flex h-screen flex-col bg-zc-bg">
            {/* UPDATED HEADER TO MATCH EXACT DESIGN
            - Flex Between
            - Title on left
            - Action Cluster on right
          */}
            <header className="shrink-0 sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zc-border bg-zc-panel/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-zc-panel/75">

              {/* Left: Title */}
              <div className="flex items-center">
                <h1 className="text-xl font-normal tracking-tight text-zc-text">{title}</h1>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3 md:gap-4">

                {/* Branch Selector (styled like the US badge in reference) */}
                {canShowBranchSelector && (
                  <div className="hidden md:block">
                    <BranchSelector />
                  </div>
                )}


                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Separator */}
                <div className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-800 md:block" />

                {/* Icons Cluster */}
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCommandOpen(true)}
                    className="text-zc-muted hover:text-zc-text"
                  >
                    <IconSearch className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => globalRefresh()}
                    disabled={refreshing}
                    aria-label="Refresh"
                    title="Refresh"
                    className="text-zc-muted hover:text-zc-text"
                  >
                    <IconRefresh className={cn("h-5 w-5", refreshing && "animate-spin")} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-zc-muted hover:text-zc-text"
                  >
                    <IconBellLocal className="h-5 w-5" />
                    <span className="absolute right-2 top-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  </Button>
                </div>

                {/* Separator */}
                <div className="hidden h-5 w-px bg-zinc-200 dark:bg-zinc-800 md:block" />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-3 pl-1 hover:opacity-80 transition-opacity"
                      aria-label="User menu"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 ring-2 ring-white dark:ring-zinc-900 border border-transparent">
                        <span className="text-xs font-semibold">
                          {(user?.name || "ZC").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="hidden items-center gap-2 text-sm font-medium text-zc-text md:flex">
                        <span>{user?.name || "User"}</span>
                        <IconChevronDown className="h-4 w-4 text-zc-muted" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="px-2.5 py-2">
                      <div className="text-sm font-semibold text-zc-text truncate">
                        {user?.name || "User"}
                      </div>
                      <div className="text-xs text-zc-muted truncate">
                        {roleLabel(user)}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        router.push("/profile" as any);
                      }}
                    >
                      <IconUsers className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        router.push("/settings" as any);
                      }}
                    >
                      <IconKeyboard className="h-4 w-4" />
                      Settings
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onSelect={(e) => {
                        e.preventDefault();
                        handleLogout();
                      }}
                    >
                      <IconLogout className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </header>

            <main className="min-w-0 flex-1 min-h-0 overflow-y-auto p-4 md:p-6 zc-scroll-no-track">
              {breadcrumbs?.length || actions ? (
                <div className="mb-4 flex flex-col gap-2">
                  {breadcrumbs?.length ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zc-muted">
                      {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={`${crumb.label}-${idx}`}>
                          {crumb.href ? (
                            <Link href={crumb.href as any} className="hover:text-zc-text">
                              {crumb.label}
                            </Link>
                          ) : (
                            <span className="text-zc-text">{crumb.label}</span>
                          )}
                          {idx < breadcrumbs.length - 1 ? (
                            <IconChevronRight className="h-3 w-3 text-zc-muted" />
                          ) : null}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-zc-text">{title}</div>
                    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
                  </div>
                </div>
              ) : null}
              <div className="w-full">{children}</div>
            </main>
          </div>
        </div>
        <CopilotWidget />
      </div>
    </CopilotProvider>
    </GlobalRefreshContext.Provider>
  );
}
