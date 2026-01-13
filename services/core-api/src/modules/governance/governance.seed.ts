import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";

/**
 * DEV seed for Policy Governance.
 *
 * We seed:
 *  - PolicyDefinition rows (the catalog)
 *  - A GLOBAL baseline PolicyVersion (APPROVED) for each definition, so the UI is immediately usable.
 */
@Injectable()
export class GovernanceSeedService implements OnModuleInit {
  private readonly log = new Logger(GovernanceSeedService.name);

  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  async onModuleInit() {
    if (process.env.AUTH_DEV_SEED !== "true") return;

    // Ensure we have a Super Admin user to attribute baseline versions.
    const superAdmin = await this.prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!superAdmin) {
      this.log.warn("Skipping Policy Governance seed: SUPER_ADMIN user not found yet.");
      return;
    }

    const catalog: Array<{
      code: string;
      name: string;
      type: string;
      description: string;
      baselinePayload: any;
    }> = [
      {
        code: "RETENTION_CLINICAL_RECORDS",
        name: "Clinical Records Retention",
        type: "RETENTION",
        description: "Retention periods for clinical records (OPD/IPD/lab/imaging) with medico-legal safe defaults.",
        baselinePayload: {
          opdYears: 5,
          ipdYears: 10,
          labYears: 2,
          imagingYears: 5,
          medicoLegalHold: { enabled: true, minYears: 10 },
        },
      },
      {
        code: "CONSENT_DEFAULTS",
        name: "Consent Defaults",
        type: "CONSENT_DEFAULTS",
        description: "Default consent posture for disclosures and patient-facing sharing.",
        baselinePayload: {
          defaultScope: ["VIEW", "STORE"],
          defaultStatus: "GRANTED",
          shareToPatientPortal: false,
          smsConsentRequired: true,
        },
      },
      {
        code: "AUDIT_LOGGING",
        name: "Audit Logging",
        type: "AUDIT",
        description: "Audit ledger granularity and retention for sensitive operations.",
        baselinePayload: {
          enabled: true,
          logPHIAccess: true,
          logExports: true,
          logBreakGlass: true,
          retentionDays: 2555,
        },
      },
      {
        code: "EXPORT_GUARDRAILS",
        name: "Export Guardrails",
        type: "EXPORTS",
        description: "Controls for CSV/Excel exports including thresholds and justification requirements.",
        baselinePayload: {
          maxRows: 50000,
          requireReason: true,
          watermark: true,
          allowPHIExport: false,
          approvalRequiredAboveRows: 10000,
        },
      },
      {
        code: "BREAK_GLASS",
        name: "Break-Glass Controls",
        type: "BREAK_GLASS",
        description: "Emergency access policy with elevated logging and mandatory justification.",
        baselinePayload: {
          enabled: true,
          requireJustification: true,
          autoExpireMinutes: 60,
          notifySecurity: true,
        },
      },
    ];

    const now = new Date();
    const effectiveAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const p of catalog) {
      const def = await this.prisma.policyDefinition.upsert({
        where: { code: p.code },
        update: {
          name: p.name,
          type: p.type,
          description: p.description,
        },
        create: {
          code: p.code,
          name: p.name,
          type: p.type,
          description: p.description,
        },
      });

      // Ensure at least one global approved version exists.
      const existing = await this.prisma.policyVersion.findFirst({
        where: { policyId: def.id, scope: "GLOBAL" },
        orderBy: { version: "asc" },
        select: { id: true },
      });
      if (existing) continue;

      await this.prisma.policyVersion.create({
        data: {
          policyId: def.id,
          scope: "GLOBAL",
          status: "APPROVED",
          version: 1,
          payload: p.baselinePayload,
          notes: "Seed baseline",
          effectiveAt,
          createdByUserId: superAdmin.id,
          approvedByUserId: superAdmin.id,
          approvedAt: now,
          applyToAllBranches: true,
        },
      });
    }

    this.log.log(`Seeded policy governance catalog (${catalog.length} definitions).`);
  }
}
