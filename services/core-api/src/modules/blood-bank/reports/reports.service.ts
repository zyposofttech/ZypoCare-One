import { Injectable } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";

@Injectable()
export class ReportsService {
  constructor(private readonly ctx: BBContextService) {}

  private dateRange(from?: string, to?: string) {
    const f = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const t = to ? new Date(to) : new Date();
    return { gte: f, lte: t };
  }

  async nacoAnnualReturn(principal: Principal, branchId: string | null, year: number) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const [totalCollected, totalIssued, totalDiscarded, voluntaryDonors, replacementDonors, ttiResults] = await Promise.all([
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, collectionStartAt: { gte: startDate, lt: endDate } } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "TRANSFUSED", updatedAt: { gte: startDate, lt: endDate } } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "DISCARDED", updatedAt: { gte: startDate, lt: endDate } } }),
      this.ctx.prisma.donor.count({ where: { branchId: bid, donorType: "VOLUNTARY" } }),
      this.ctx.prisma.donor.count({ where: { branchId: bid, donorType: "REPLACEMENT" } }),
      this.ctx.prisma.tTITestRecord.groupBy({
        by: ["testName", "result"],
        where: { bloodUnit: { branchId: bid }, createdAt: { gte: startDate, lt: endDate } },
        _count: true,
      }),
    ]);

    return {
      year, branchId: bid,
      totalCollected, totalIssued, totalDiscarded,
      voluntaryDonors, replacementDonors,
      voluntaryPercentage: totalCollected > 0 ? Math.round((voluntaryDonors / totalCollected) * 100) : 0,
      ttiResults,
    };
  }

  async sbtcQuarterlyReturn(principal: Principal, branchId: string | null, year: number, quarter: number) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 1);

    const [collections, issues, discards, components] = await Promise.all([
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, collectionStartAt: { gte: startDate, lt: endDate }, parentUnitId: null } }),
      this.ctx.prisma.bloodIssue.count({ where: { branchId: bid, createdAt: { gte: startDate, lt: endDate } } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "DISCARDED", updatedAt: { gte: startDate, lt: endDate } } }),
      this.ctx.prisma.bloodUnit.groupBy({
        by: ["componentType"],
        where: { branchId: bid, collectionStartAt: { gte: startDate, lt: endDate }, parentUnitId: { not: null } },
        _count: true,
      }),
    ]);

    return { year, quarter, branchId: bid, collections, issues, discards, componentBreakdown: components };
  }

  async utilizationReport(principal: Principal, branchId: string | null, from?: string, to?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const range = this.dateRange(from, to);

    const [collected, issued, discarded, byGroup] = await Promise.all([
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, collectionStartAt: range } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "TRANSFUSED", updatedAt: range } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "DISCARDED", updatedAt: range } }),
      this.ctx.prisma.bloodUnit.groupBy({
        by: ["bloodGroup"],
        where: { branchId: bid, collectionStartAt: range },
        _count: true,
      }),
    ]);

    return {
      branchId: bid, from: range.gte, to: range.lte,
      collected, issued, discarded,
      utilizationRate: collected > 0 ? Math.round((issued / collected) * 100) : 0,
      discardRate: collected > 0 ? Math.round((discarded / collected) * 100) : 0,
      byBloodGroup: byGroup,
    };
  }

  async haemovigilanceReport(principal: Principal, branchId: string | null, from?: string, to?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const range = this.dateRange(from, to);

    const reactions = await this.ctx.prisma.transfusionReaction.findMany({
      where: { transfusionRecord: { branchId: bid }, createdAt: range },
      include: {
        transfusionRecord: {
          select: { id: true, patientId: true, issueId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const byType = reactions.reduce((acc: Record<string, number>, r) => {
      acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
      return acc;
    }, {});

    const totalTransfusions = await this.ctx.prisma.transfusionRecord.count({
      where: { branchId: bid, createdAt: range },
    });

    return {
      branchId: bid, from: range.gte, to: range.lte,
      totalTransfusions,
      totalReactions: reactions.length,
      reactionRate: totalTransfusions > 0 ? ((reactions.length / totalTransfusions) * 100).toFixed(2) : "0",
      byReactionType: byType,
      reactions,
    };
  }

  async discardAnalysis(principal: Principal, branchId: string | null, from?: string, to?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const range = this.dateRange(from, to);

    const discards = await this.ctx.prisma.bloodUnit.groupBy({
      by: ["bloodGroup"],
      where: { branchId: bid, status: "DISCARDED", updatedAt: range },
      _count: { _all: true },
    });

    const total = discards.reduce((sum, d) => sum + d._count._all, 0);
    return {
      branchId: bid, from: range.gte, to: range.lte,
      total,
      byBloodGroup: discards.map((d) => ({
        bloodGroup: d.bloodGroup,
        count: d._count._all,
        percentage: total > 0 ? ((d._count._all / total) * 100).toFixed(1) : "0",
      })),
    };
  }

  async donorDeferralReport(principal: Principal, branchId: string | null, from?: string, to?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const range = this.dateRange(from, to);

    const deferrals = await this.ctx.prisma.donorDeferral.findMany({
      where: { donor: { branchId: bid }, createdAt: range },
      include: { donor: { select: { id: true, donorNumber: true, name: true } } },
    });

    const byType = deferrals.reduce((acc: Record<string, number>, d) => {
      acc[d.deferralType] = (acc[d.deferralType] || 0) + 1;
      return acc;
    }, {});

    return {
      branchId: bid, from: range.gte, to: range.lte,
      total: deferrals.length,
      byType,
      deferrals,
    };
  }

  async ttiSeroprevalence(principal: Principal, branchId: string | null, from?: string, to?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const range = this.dateRange(from, to);

    const results = await this.ctx.prisma.tTITestRecord.groupBy({
      by: ["testName", "result"],
      where: { bloodUnit: { branchId: bid }, createdAt: range },
      _count: true,
    });

    const testNames = [...new Set(results.map((r) => r.testName))];
    const summary = testNames.map((testName) => {
      const testResults = results.filter((r) => r.testName === testName);
      const reactive = testResults.find((r) => r.result === "REACTIVE")?._count ?? 0;
      const nonReactive = testResults.find((r) => r.result === "NON_REACTIVE")?._count ?? 0;
      const total = testResults.reduce((sum, r) => sum + r._count, 0);
      return {
        testName,
        total, reactive, nonReactive,
        prevalenceRate: total > 0 ? ((reactive / total) * 100).toFixed(3) : "0",
      };
    });

    return { branchId: bid, from: range.gte, to: range.lte, summary };
  }

  async dailySummary(principal: Principal, branchId: string | null, date?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    const day = date ? new Date(date) : new Date();
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const [collected, tested, issued, discarded, reactions, currentInventory] = await Promise.all([
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, collectionStartAt: { gte: day, lt: nextDay } } }),
      this.ctx.prisma.tTITestRecord.count({ where: { bloodUnit: { branchId: bid }, createdAt: { gte: day, lt: nextDay } } }),
      this.ctx.prisma.bloodIssue.count({ where: { branchId: bid, createdAt: { gte: day, lt: nextDay } } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "DISCARDED", updatedAt: { gte: day, lt: nextDay } } }),
      this.ctx.prisma.transfusionReaction.count({ where: { transfusionRecord: { branchId: bid }, createdAt: { gte: day, lt: nextDay } } }),
      this.ctx.prisma.bloodUnit.count({ where: { branchId: bid, status: "AVAILABLE" } }),
    ]);

    return {
      date: day.toISOString().slice(0, 10),
      branchId: bid,
      collected, tested, issued, discarded, reactions, currentInventory,
    };
  }
}
