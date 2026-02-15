import { Injectable } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { BBContextService } from "../shared/bb-context.service";

@Injectable()
export class AiService {
  constructor(private readonly ctx: BBContextService) {}

  async insights(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);

    const now = new Date();
    const exp7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stock = await this.ctx.prisma.bloodUnit.groupBy({
      by: ["bloodGroup", "componentType"],
      where: { branchId: bid, status: "AVAILABLE" },
      _count: { _all: true },
      orderBy: [{ bloodGroup: "asc" }, { componentType: "asc" }],
    });

    const expiring = await this.ctx.prisma.bloodUnit.findMany({
      where: { branchId: bid, status: "AVAILABLE", expiryDate: { lte: exp7 } },
      select: { id: true, unitNumber: true, bloodGroup: true, componentType: true, expiryDate: true },
      orderBy: { expiryDate: "asc" },
      take: 50,
    });

    const transferCounts = await this.ctx.prisma.bloodUnitTransfer.groupBy({
      by: ["status"],
      where: { OR: [{ fromBranchId: bid }, { toBranchId: bid }] },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const r of transferCounts) counts[r.status as any] = r._count._all;

    // Basic heuristics (AI stubs): low stock threshold
    const LOW_THRESHOLD = 5;
    const lowStock = stock
      .map((r) => ({
        bloodGroup: r.bloodGroup,
        componentType: r.componentType,
        available: r._count._all,
        threshold: LOW_THRESHOLD,
        isLow: r._count._all < LOW_THRESHOLD,
      }))
      .filter((x) => x.isLow)
      .slice(0, 30);

    const recommendations = [] as Array<{ severity: "INFO" | "WARN" | "CRITICAL"; title: string; detail: string }>;
    if (expiring.length) {
      recommendations.push({
        severity: expiring.length > 10 ? "CRITICAL" : "WARN",
        title: "Units expiring soon",
        detail: `${expiring.length} unit(s) expiring within 7 days. Prioritize issue/redistribution.`,
      });
    }
    if (lowStock.length) {
      recommendations.push({
        severity: "WARN",
        title: "Low stock detected",
        detail: `${lowStock.length} blood group/component bucket(s) below threshold. Plan donation drive or inter-branch transfer.`,
      });
    }
    if ((counts["DISPATCHED"] ?? 0) > 0) {
      recommendations.push({
        severity: "INFO",
        title: "Transfers in transit",
        detail: `${counts["DISPATCHED"]} transfer(s) are dispatched/in transit. Ensure timely receiving and placement.`,
      });
    }

    return {
      branchId: bid,
      generatedAt: now.toISOString(),
      stockLevels: stock.map((r) => ({
        bloodGroup: r.bloodGroup,
        componentType: r.componentType,
        available: r._count._all,
      })),
      expiring: { withinDays: 7, count: expiring.length, units: expiring },
      transfers: counts,
      aiStubs: {
        lowStock,
        recommendations,
        note:
          "Heuristic insights (phase-1). Replace with ML models later (demand forecasting, wastage prediction, donor churn, anomaly detection).",
      },
    };
  }
}
