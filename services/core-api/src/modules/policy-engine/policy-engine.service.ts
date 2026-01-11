import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";
import type { Principal } from "../auth/access-policy.service";

export type EffectivePolicy = {
  code: string;
  definitionId: string;
  scope: "GLOBAL" | "BRANCH_OVERRIDE";
  versionId: string;
  version: number;
  effectiveAt: Date;
  payload: any;
};

type CacheEntry<T> = { exp: number; value: T };

function deepMerge(base: any, override: any): any {
  if (override === null || override === undefined) return base;
  if (base === null || base === undefined) return override;

  // Arrays: override wins
  if (Array.isArray(base) || Array.isArray(override)) return override;

  // Objects: recursive merge
  if (typeof base === "object" && typeof override === "object") {
    const out: any = { ...base };
    for (const k of Object.keys(override)) {
      out[k] = deepMerge(base[k], override[k]);
    }
    return out;
  }

  // Primitives: override wins
  return override;
}

@Injectable()
export class PolicyEngineService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  /**
   * Small, safe in-memory cache to avoid repeated policy lookups per request burst.
   * (Policies are changed rarely, reads happen frequently.)
   */
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly ttlMs = 30_000;

  private cacheKey(code: string, branchId: string | null) {
    return `${code}::${branchId ?? "__none__"}`;
  }

  /**
   * Cache lookup.
   *
   * Returns `undefined` when there is no cache hit (or when expired).
   * This allows caching `null` values safely.
   */
  private getCached<T>(key: string): T | undefined {
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.exp) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  private setCached<T>(key: string, value: T) {
    this.cache.set(key, { exp: Date.now() + this.ttlMs, value });
  }

  /**
   * Explicit cache invalidation.
   *
   * Call this after a policy version is approved/retired so subsequent reads
   * resolve immediately to the new effective payload.
   */
  invalidate(codeRaw?: string, branchId?: string | null) {
    const code = (codeRaw || "").trim().toUpperCase();

    // If no code specified, clear all.
    if (!code) {
      this.cache.clear();
      return;
    }

    // Remove all keys for this policy code.
    const prefix = `${code}::`;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }

    // If branchId specified, also remove the exact key (covers odd formatting).
    if (branchId !== undefined) {
      this.cache.delete(this.cacheKey(code, branchId ?? null));
    }
  }

  /** Resolve "effective" policy for a branch (override if present, else global baseline). */
  async getEffectivePolicy(codeRaw: string, branchId: string | null): Promise<EffectivePolicy | null> {
    const code = (codeRaw || "").trim().toUpperCase();
    if (!code) throw new BadRequestException("policy code is required");

    const key = this.cacheKey(code, branchId);
    const cached = this.getCached<EffectivePolicy | null>(key);
    if (cached !== undefined) return cached;

    const def = await this.prisma.policyDefinition.findUnique({
      where: { code },
      select: { id: true, code: true },
    });
    if (!def) {
      this.setCached(key, null);
      return null;
    }

    const now = new Date();

    // 1) Branch override
    const override = branchId
      ? await this.prisma.policyVersion.findFirst({
          where: {
            policyId: def.id,
            scope: "BRANCH_OVERRIDE",
            branchId,
            status: "APPROVED",
            effectiveAt: { lte: now },
          },
          orderBy: [{ version: "desc" }],
          select: {
            id: true,
            version: true,
            effectiveAt: true,
            payload: true,
          },
        })
      : null;

    // 2) Global baseline (optionally branch-targeted)
    const global = await this.prisma.policyVersion.findFirst({
      where: {
        policyId: def.id,
        scope: "GLOBAL",
        status: "APPROVED",
        effectiveAt: { lte: now },
        ...(branchId
          ? {
              OR: [
                { applyToAllBranches: true },
                { applyToAllBranches: false, branches: { some: { branchId } } },
              ],
            }
          : { applyToAllBranches: true }),
      },
      orderBy: [{ version: "desc" }],
      select: {
        id: true,
        version: true,
        effectiveAt: true,
        payload: true,
      },
    });

    if (!global && !override) {
      this.setCached(key, null);
      return null;
    }

    // Effective payload: global merged with override (override wins per field)
    const payload = deepMerge(global?.payload ?? {}, override?.payload ?? null);

    const effective: EffectivePolicy = {
      code,
      definitionId: def.id,
      scope: override ? "BRANCH_OVERRIDE" : "GLOBAL",
      versionId: (override?.id ?? global!.id) as string,
      version: (override?.version ?? global!.version) as number,
      effectiveAt: (override?.effectiveAt ?? global!.effectiveAt) as Date,
      payload,
    };

    this.setCached(key, effective);
    return effective;
  }

  /** Convenience: read policy payload with a safe default. */
  async getPayload(code: string, branchId: string | null, fallback: any = {}): Promise<any> {
    const eff = await this.getEffectivePolicy(code, branchId);
    return eff?.payload ?? fallback;
  }

  /**
   * Export guardrails enforcement (CSV/Excel exports).
   *
   * Call this BEFORE generating an export.
   */
  async enforceExport(principal: Principal, opts: { rows: number; containsPHI: boolean; reason?: string | null }) {
    const p = await this.getPayload("EXPORT_GUARDRAILS", principal.branchId ?? null, {
      maxRows: 50000,
      requireReason: true,
      watermark: true,
      allowPHIExport: false,
      approvalRequiredAboveRows: 10000,
    });

    const rows = Number(opts.rows ?? 0);
    if (!Number.isFinite(rows) || rows < 0) throw new BadRequestException("Invalid rows");

    if (rows > Number(p.maxRows ?? 0)) {
      throw new ForbiddenException(`Export exceeds maxRows (${p.maxRows})`);
    }

    if (p.requireReason && !(opts.reason || "").trim()) {
      throw new BadRequestException("Export reason is required by policy");
    }

    if (opts.containsPHI && p.allowPHIExport === false) {
      throw new ForbiddenException("PHI export is disabled by policy");
    }

    return { ok: true, watermark: !!p.watermark };
  }
}
