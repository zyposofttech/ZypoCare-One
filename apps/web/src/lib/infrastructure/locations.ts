export type LocationNodeType = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";

export type LocationNode = {
  id: string;
  branchId?: string;
  type: LocationNodeType;
  parentId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;

  buildings?: LocationNode[];
  floors?: LocationNode[];
  zones?: LocationNode[];
};

export type LocationTree = { campuses: LocationNode[] };

export type LocationFlat = {
  id: string;
  type: LocationNodeType;
  code: string;
  name: string;
  isActive: boolean;
  pathLabel: string; // Campus/Building/Floor/Zone
  pathCode: string;  // code path
};

function nodeLabel(n: LocationNode) {
  return `${n.name} (${n.code})`;
}

function walk(
  n: LocationNode,
  path: LocationNode[],
  out: LocationFlat[],
  allowTypes: Set<LocationNodeType>,
  includeInactive: boolean,
) {
  const nextPath = [...path, n];
  const isActive = !!n.isActive;

  if (allowTypes.has(n.type) && (includeInactive || isActive)) {
    out.push({
      id: n.id,
      type: n.type,
      code: n.code,
      name: n.name,
      isActive,
      pathLabel: nextPath.map(nodeLabel).join(" / "),
      pathCode: nextPath.map((x) => x.code).join("/"),
    });
  }

  for (const b of n.buildings || []) walk(b, nextPath, out, allowTypes, includeInactive);
  for (const f of n.floors || []) walk(f, nextPath, out, allowTypes, includeInactive);
  for (const z of n.zones || []) walk(z, nextPath, out, allowTypes, includeInactive);
}

export function flattenLocationTree(
  tree: LocationTree | null | undefined,
  opts?: { allowTypes?: LocationNodeType[]; includeInactive?: boolean },
): LocationFlat[] {
  if (!tree?.campuses?.length) return [];
  const allowTypes = new Set<LocationNodeType>(opts?.allowTypes || ["ZONE", "FLOOR"]);
  const includeInactive = !!opts?.includeInactive;

  const out: LocationFlat[] = [];
  for (const c of tree.campuses) walk(c, [], out, allowTypes, includeInactive);
  return out;
}

export function locationChipLabel(flat: LocationFlat | null | undefined) {
  if (!flat) return "";
  return `${flat.name} (${flat.code})`;
}
