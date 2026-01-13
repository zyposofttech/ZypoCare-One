"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/lib/auth/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"; // Added Dialog imports
import { ToastHost } from "@/components/ToastHost";
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
  type IconProps,
} from "@/components/icons";

// --- Types & Data ---

type NavNode = {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
  badge?: { label: string; tone?: "neutral" | "info" | "new" | "soon" };
  children?: Array<{ label: string; href: string; badge?: NavNode["badge"] }>;
};

type NavGroup = {
  title: string;
  items: NavNode[];
};

const NAV_WORKSPACES: NavNode[] = [
  {
    label: "Central Console",
    href: "/superadmin",
    icon: IconDashboard,
    children: [
      { label: "Overview", href: "/superadmin/dashboard" },
      { label: "Branches", href: "/superadmin/branches" },
      { label: "Policy Governance", href: "/superadmin/policy" },
      { label: "Policy Presets", href: "/superadmin/policy/presets"},
      { label: "Policies", href: "/superadmin/policy/policies" },
      { label: "Approvals", href: "/superadmin/policy/approvals" },
      { label: "Audit Trail", href: "/superadmin/policy/audit" },
      { label: "Reports", href: "/superadmin/reports" },
    ],
  },
  {
    label: "Infrastructure Setup",
    href: "/superadmin/infrastructure",
    icon: IconBuilding,
    children: [
      { label: "Overview", href: "/superadmin/infrastructure" },

      { label: "Locations (Building)", href: "/superadmin/infrastructure/locations" },
      { label: "Unit Types", href: "/superadmin/infrastructure/unit-types" },

      { label: "Units", href: "/superadmin/infrastructure/units" },
      { label: "Rooms / Bays", href: "/superadmin/infrastructure/rooms" },
      { label: "Resources", href: "/superadmin/infrastructure/resources" },

      { label: "Bed States + Housekeeping Gate", href: "/superadmin/infrastructure/bed-policy" },
      { label: "OT Scheduling", href: "/superadmin/infrastructure/ot" },

      { label: "Diagnostics Configuration", href: "/superadmin/infrastructure/diagnostics" },
      { label: "Equipment Register", href: "/superadmin/infrastructure/equipment" },

      { label: "Service Items", href: "/superadmin/infrastructure/service-items" },
      { label: "Charge Master", href: "/superadmin/infrastructure/charge-master" },
      { label: "Fix-It Queue", href: "/superadmin/infrastructure/fixit" },

      { label: "Bulk Import (CSV/XLS)", href: "/superadmin/infrastructure/import" },
      { label: "Go-Live Validator", href: "/superadmin/infrastructure/go-live" },
    ],
  },
  {
    label: "Branch Admin",
    href: "/admin",
    icon: IconBuilding,
    children: [
      { label: "Policy Overrides", href: "/admin/policy" },
      { label: "Facility Setup", href: "/admin/facility" },
      { label: "Departments", href: "/admin/departments" },
      { label: "Staff Directory", href: "/admin/staff" },
      { label: "Specialties", href: "/admin/specialties" },
      { label: "Wards", href: "/admin/wards" },
      { label: "Beds", href: "/admin/beds", badge: { label: "New", tone: "new" } },
      { label: "OT Setup", href: "/admin/ot" },
      { label: "Labs Setup", href: "/admin/labs" },
      { label: "Users & Roles", href: "/admin/users" },
      { label: "Duty Rosters", href: "/admin/duty" },
      { label: "Settings", href: "/admin/settings" },
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
    label: "Billing, Finance & TPA",
    href: "/billing",
    icon: IconReceipt,
    children: [
      { label: "Tariffs", href: "/billing/tariffs" },
      { label: "Packages", href: "/billing/packages" },
      { label: "Billing Desk", href: "/billing/billing-desk" },
      { label: "Cashier", href: "/billing/cashier" },
      { label: "TPA Claims", href: "/billing/tpa" },
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
    label: "Compliance & Governance",
    href: "/compliance",
    icon: IconShield,
    children: [
      { label: "Consent Manager", href: "/compliance/consent" },
      { label: "Rights (RTBF)", href: "/compliance/rights" },
      { label: "Audit Ledger", href: "/compliance/audit-ledger" },
      { label: "Records Governance", href: "/compliance/records" },
      { label: "Break Glass", href: "/compliance/break-glass" },
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
      { label: "App Users", href: "/admin/users" },
      { label: "Audit Trails", href: "/access/audit" },
    ],
  },
];

const NAV_GROUPS: NavGroup[] = [
  { title: "Workspaces", items: NAV_WORKSPACES },
  { title: "Care Delivery", items: NAV_CARE },
  { title: "Governance & Ops", items: NAV_GOVERN },
];

// --- Command Center Helpers ---

// Flatten the navigation tree for searching
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => {
    const results = [
      {
        label: item.label,
        href: item.href,
        icon: item.icon,
        group: group.title,
        type: "Parent",
      },
    ];
    if (item.children) {
      results.push(
        ...item.children.map((child) => ({
          label: child.label,
          href: child.href,
          icon: item.icon, // Inherit icon from parent module
          group: group.title,
          type: "Child",
          parent: item.label,
        }))
      );
    }
    return results;
  })
);

// --- Helpers ---

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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

function NavBadge({ badge }: { badge?: NavNode["badge"] }) {
  if (!badge) return null;
  const tone = badge.tone ?? "neutral";
  const cls =
    tone === "new"
      ? "border-xc-accent/40 bg-xc-accent/15 text-xc-accent"
      : tone === "soon"
        ? "border-xc-border/80 bg-[rgb(var(--xc-hover-rgb)/0.04)] text-xc-muted"
        : "border-xc-border/80 bg-[rgb(var(--xc-hover-rgb)/0.04)] text-xc-muted";

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

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Initialize state
  const [collapsed, setCollapsed] = React.useState(false);
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  const [groupOpenMap, setGroupOpenMap] = React.useState<Record<string, boolean>>({});
  const [navQuery, setNavQuery] = React.useState("");
  
  // Command Center State
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");

  // Hydrate state from local storage on mount
  React.useEffect(() => {
    setCollapsed(readBool("xc.sidebarCollapsed", false));
    setOpenMap(readJSON<Record<string, boolean>>("xc.sidebarOpenMap", {}));
    setGroupOpenMap(
      readJSON<Record<string, boolean>>("xc.sidebarGroupOpenMap", {
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

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      writeBool("xc.sidebarCollapsed", next);
      return next;
    });
  }

  function toggleOpen(key: string) {
    setOpenMap((m) => {
      const next = { ...m, [key]: !(m[key] ?? true) };
      writeJSON("xc.sidebarOpenMap", next);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setGroupOpenMap((m) => {
      const next = { ...m, [key]: !(m[key] ?? true) };
      writeJSON("xc.sidebarGroupOpenMap", next);
      return next;
    });
  }

  // Filter Command Center Results
  const filteredCommandItems = React.useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return [];
    
    // Simple relevance scoring could be added here, currently just substring match
    return ALL_NAV_ITEMS.filter(item => 
      item.label.toLowerCase().includes(q) || 
      (item.parent && item.parent.toLowerCase().includes(q)) ||
      item.group.toLowerCase().includes(q)
    ).slice(0, 10); // Limit to top 10 results
  }, [commandQuery]);

  const visibleGroups = React.useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return NAV_GROUPS;

    const filtered: NavGroup[] = [];
    for (const g of NAV_GROUPS) {
      const items: NavNode[] = [];
      for (const n of g.items) {
        const selfMatch = n.label.toLowerCase().includes(q) || n.href.toLowerCase().includes(q);
        const children = (n.children ?? []).filter((c) =>
          (c.label + " " + c.href).toLowerCase().includes(q)
        );
        if (!selfMatch && children.length === 0) continue;
        items.push({ ...n, children: selfMatch ? n.children : children });
      }
      if (items.length) filtered.push({ ...g, items });
    }
    return filtered;
  }, [navQuery]);

  const sidebarW = collapsed ? "w-[72px]" : "w-[280px]";
  const rowHover = "hover:bg-[rgb(var(--xc-hover-rgb)/0.06)]";
  const rowActive = "bg-[rgb(var(--xc-hover-rgb)/0.10)]";

  return (
    <div className="h-screen overflow-hidden bg-xc-bg text-xc-text">
      {/* Command Center Dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 gap-0 overflow-hidden max-w-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <DialogTitle className="sr-only">Command Center</DialogTitle>
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 py-1">
            <IconSearch className="mr-2 h-5 w-5 shrink-0 text-zinc-400" />
            <input 
              className="flex h-12 w-full bg-transparent py-3 text-base outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100" 
              placeholder="Type a command or search..." 
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              autoFocus
            />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {!commandQuery && (
               <div className="py-12 text-center text-sm text-zinc-500">
                 <IconKeyboard className="mx-auto h-8 w-8 mb-3 opacity-50" />
                 <p>Type to search across apps, pages, and commands.</p>
               </div>
            )}
            
            {commandQuery && filteredCommandItems.length === 0 && (
               <div className="py-6 text-center text-sm text-zinc-500">
                 No results found for "{commandQuery}"
               </div>
            )}

            {filteredCommandItems.length > 0 && (
              <div className="space-y-1">
                <h4 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Suggestions</h4>
                {filteredCommandItems.map((item, i) => (
                  <button
                    key={item.href + i}
                    onClick={() => {
                      router.push(item.href);
                      setCommandOpen(false);
                      setCommandQuery("");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                      <item.icon className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{item.label}</span>
                      <span className="text-xs text-zinc-400 truncate">
                        {item.group} {item.parent ? ` / ${item.parent}` : ""}
                      </span>
                    </div>
                    <IconChevronRight className="h-4 w-4 text-zinc-400 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-2.5 text-[10px] text-zinc-500">
             <div>Use arrow keys to navigate</div>
             <div>Zypocare OS v4.2</div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-screen min-w-0">
        {/* Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex h-screen flex-col",
            sidebarW,
            "shrink-0 border-r border-xc-border bg-xc-panel transition-[width] duration-300 ease-in-out", // Added smooth width transition
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
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-xc-border bg-xc-card">
                  <IconZypoCare className="h-5 w-5 text-xc-accent" />
                </div>

                <div
                  className={cn(
                    "flex min-w-0 flex-col transition-all duration-300",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                >
                  <div className="truncate text-sm font-semibold tracking-tight">ZypoCare ONE</div>
                  <div className="mt-0.5 truncate text-xs text-xc-muted">
                    {user?.role ? user.role.replaceAll("_", " ") : "SUPER ADMIN"}
                  </div>
                </div>
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
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-xc-muted" />
                <Input
                  value={navQuery}
                  onChange={(e) => setNavQuery(e.target.value)}
                  placeholder="Search modules"
                  className={cn(
                    "h-10 pl-10 rounded-lg",
                    "bg-xc-card border-xc-border",
                    "focus-visible:ring-2 focus-visible:ring-xc-ring"
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="shrink-0 px-3 pb-3">
              <Separator className="bg-xc-border" />
            </div>
          )}

          {/* Navigation Items */}
          <nav
            className={cn(
              "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
              collapsed ? "px-2 pb-4" : "px-3 pb-4"
            )}
          >
            <div className={cn("grid", collapsed ? "gap-4" : "gap-6")}>
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
                          "text-[11px] font-semibold uppercase tracking-wide text-xc-muted",
                          "hover:text-xc-text",
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
                        "grid gap-1",
                        !collapsed && !groupOpen ? "hidden" : "block"
                      )}
                    >
                      {group.items.map((node) => {
                        const Icon = node.icon;
                        const active = isActivePath(pathname, node.href);
                        const open = (openMap[node.href] ?? true) && !collapsed;

                        const linkBase = cn(
                          "group flex min-w-0 items-center gap-3 rounded-lg",
                          collapsed ? "px-0 py-2 justify-center" : "px-3 py-2",
                          "text-sm font-medium transition-colors duration-200", // Smooth hover/active transition
                          rowHover
                        );

                        return (
                          <div key={node.href} className="min-w-0">
                            <div className="relative">
                              <Link
                                href={node.href}
                                title={collapsed ? node.label : undefined}
                                className={cn(linkBase, active ? rowActive : "")}
                                aria-current={active ? "page" : undefined}
                              >
                                <Icon
                                  className={cn(
                                    "h-4 w-4 shrink-0 transition-colors",
                                    active
                                      ? "text-xc-accent"
                                      : "text-xc-muted group-hover:text-xc-text"
                                  )}
                                />

                                {!collapsed && (
                                  <span
                                    className={cn(
                                      "min-w-0 flex-1 truncate transition-colors",
                                      active ? "text-xc-text" : "text-xc-text/90"
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
                                    "text-xc-muted",
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
                              <div className="mt-1 grid gap-1 pl-9 animate-in slide-in-from-top-1 duration-200">
                                {node.children.map((c) => {
                                  const childActive = isActivePath(pathname, c.href);
                                  return (
                                    <Link
                                      key={c.href}
                                      href={c.href}
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
                                          childActive ? "bg-xc-accent" : "bg-xc-border"
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          "min-w-0 flex-1 truncate transition-colors",
                                          childActive
                                            ? "text-xc-text"
                                            : "text-xc-muted group-hover:text-xc-text"
                                        )}
                                      >
                                        {c.label}
                                      </span>
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
          <div className={cn("shrink-0 border-t border-xc-border", collapsed ? "p-3" : "p-4")}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              {!collapsed ? (
                <>
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-xc-card border border-xc-border text-xs font-semibold">
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
                    <div className="mt-0.5 truncate text-xs text-xc-muted">
                      ExcelCare Hospital • Bengaluru
                    </div>
                  </div>
                </>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
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
        <div className="min-w-0 flex-1 flex h-screen flex-col bg-xc-bg">
          <header className="shrink-0 border-b border-xc-border bg-xc-panel">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">{title}</div>
                {user ? (
                  <div className="mt-0.5 truncate text-xs text-xc-muted">
                    {user.name} • {user.role.replaceAll("_", " ")}
                  </div>
                ) : null}
              </div>

              <div className="hidden min-w-0 flex-1 px-3 md:flex">
                <div className="relative w-full max-w-[720px]">
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-xc-muted" />
                  {/* Updated Header Input to trigger Command Center */}
                  <Input
                    onClick={() => setCommandOpen(true)} // Open Command on click
                    readOnly // Prevent typing directly, use modal instead
                    placeholder="Search… (Ctrl/Cmd + K)"
                    className={cn(
                      "h-10 pl-10 rounded-lg cursor-pointer",
                      "bg-xc-card border-xc-border",
                      "focus-visible:ring-2 focus-visible:ring-xc-ring hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCommandOpen(true)} // Updated Button to Open Command
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition"
                >
                  <IconKeyboard className="h-4 w-4" />
                  Command Center
                </Button>
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                  aria-label="Logout"
                  title="Logout"
                  className="rounded-full"
                >
                  <IconLogout className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}