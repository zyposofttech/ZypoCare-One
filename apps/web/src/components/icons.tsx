import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : "presentation"}
      aria-label={title}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 13h8V3H3v10z" />
      <path d="M13 21h8V11h-8v10z" />
      <path d="M13 3h8v6h-8z" />
      <path d="M3 17h8v4H3z" />
    </Svg>
  );
}

// Zypocare brand mark (simple medical cross + ring) — used in sidebar/header.
export function IconZypoCare(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M7 12h10" />
      <path d="M16.5 7.5l.01.01" />
    </Svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 21V7l9-4 9 4v14" />
      <path d="M9 21V9h6v12" />
      <path d="M7 12h.01" />
      <path d="M7 15h.01" />
      <path d="M17 12h.01" />
      <path d="M17 15h.01" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function IconStethoscope(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v6a6 6 0 0 0 12 0V3" />
      <path d="M8 3v6" />
      <path d="M16 3v6" />
      <path d="M12 15v2a4 4 0 0 0 8 0v-2" />
      <circle cx="20" cy="15" r="2" />
    </Svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <path d="M8 11h8" />
      <path d="M8 15h8" />
    </Svg>
  );
}

export function IconBed(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7v10" />
      <path d="M21 17V7" />
      <path d="M3 12h18" />
      <path d="M7 12V9h5a3 3 0 0 1 3 3" />
      <path d="M3 17h18" />
    </Svg>
  );
}

export function IconFlask(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 2v6l-5 9a4 4 0 0 0 3.5 6h7a4 4 0 0 0 3.5-6l-5-9V2" />
      <path d="M8 8h8" />
      <path d="M7 16h10" />
    </Svg>
  );
}

export function IconPill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 20.5a6 6 0 0 1 0-8.5l1.5-1.5a6 6 0 0 1 8.5 8.5l-1.5 1.5a6 6 0 0 1-8.5 0z" />
      <path d="M14 7l3 3" />
      <path d="M6 18l6-6" />
    </Svg>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 17v-6" />
      <path d="M12 17V8" />
      <path d="M16 17v-3" />
    </Svg>
  );
}

export function IconBrain(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 3A3.5 3.5 0 0 0 5 6.5c0 .7.2 1.3.5 1.9A3 3 0 0 0 4 11a3 3 0 0 0 3 3h1" />
      <path d="M15.5 3A3.5 3.5 0 0 1 19 6.5c0 .7-.2 1.3-.5 1.9A3 3 0 0 1 20 11a3 3 0 0 1-3 3h-1" />
      <path d="M9 3.5V21" />
      <path d="M15 3.5V21" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </Svg>
  );
}

export function IconCog(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.1-2-3.5-2.3.6a7.5 7.5 0 0 0-1.7-1L15 3h-6l-.5 4a7.5 7.5 0 0 0-1.7 1L4.5 7.4l-2 3.5L4.5 12a7.8 7.8 0 0 0 .1 2L2.5 15.1l2 3.5 2.3-.6a7.5 7.5 0 0 0 1.7 1L9 21h6l.5-4a7.5 7.5 0 0 0 1.7-1l2.3.6 2-3.5-2.1-1.1z" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconPanelLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M14 9l-2 3 2 3" />
    </Svg>
  );
}

export function IconPanelRight(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
      <path d="M10 9l2 3-2 3" />
    </Svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.2 4.2l1.4 1.4" />
      <path d="M18.4 18.4l1.4 1.4" />
      <path d="M18.4 5.6l1.4-1.4" />
      <path d="M4.2 19.8l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Svg>
  );
}
export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </Svg>
  );
}
export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconKeyboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 11h.01" />
      <path d="M10 11h.01" />
      <path d="M13 11h.01" />
      <path d="M16 11h.01" />
      <path d="M7 14h10" />
    </Svg>
  );
}
