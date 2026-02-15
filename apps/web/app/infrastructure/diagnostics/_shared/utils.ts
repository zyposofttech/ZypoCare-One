import type { EquipmentAssetRow, LocationTreeNode, FlatLocationNode } from "./types";

/* =========================================================
   Utilities (aligned to backend regex + maxLen)
   ========================================================= */

export const CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{0,63}$/; // backend: 1-64

export function normalizeCode(v: any) {
  let code = String(v ?? "").trim().toUpperCase();
  code = code.replace(/[^A-Z0-9-]+/g, "-");
  code = code.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return code;
}

export function isBlank(v: any) {
  return !String(v ?? "").trim();
}

export function validateCode(v: any, label: string): string | null {
  const code = normalizeCode(v);
  if (!code) return `${label} code is required`;
  if (!CODE_REGEX.test(code)) return `${label} code must be 1-64 chars, letters/numbers/hyphen (e.g., TH01, OT-1, LAB1)`;
  return null;
}

export function validateName(v: any, label: string): string | null {
  const name = String(v ?? "").trim();
  if (!name) return `${label} name is required`;
  if (name.length > 160) return `${label} name is too long`;
  return null;
}

export function toInt(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function toFloat(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/([0-9]+(\.[0-9]+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function safeArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function normalizeEquipmentList(resp: unknown): EquipmentAssetRow[] {
  if (Array.isArray(resp)) return resp as EquipmentAssetRow[];
  const rows = (resp as any)?.rows;
  if (Array.isArray(rows)) return rows as EquipmentAssetRow[];
  return [];
}

export function flattenLocationTree(nodes: LocationTreeNode[], parentPath = ""): FlatLocationNode[] {
  const out: FlatLocationNode[] = [];
  for (const n of safeArray<LocationTreeNode>(nodes)) {
    const path = parentPath ? `${parentPath} / ${n.name}` : n.name;
    out.push({ id: n.id, type: n.type, code: n.code, name: n.name, path });
    const kids = [...safeArray(n.buildings), ...safeArray(n.floors), ...safeArray(n.zones)];
    out.push(...flattenLocationTree(kids, path));
  }
  return out;
}

export function normalizeLocationTree(res: any): LocationTreeNode[] {
  if (Array.isArray(res)) return res as LocationTreeNode[];
  return safeArray<LocationTreeNode>(res?.campuses);
}

export function asRecord(v: any): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  return {};
}
