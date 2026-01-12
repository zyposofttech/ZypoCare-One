import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";
import { INFRA_POLICY } from "./infrastructure.constants";

const UNIT_TYPES = [
  { code: "WARD", name: "Ward / IPD", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 1 },
  { code: "ICU", name: "ICU", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 2 },
  { code: "HDU", name: "HDU", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 3 },
  { code: "NICU", name: "NICU", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 4 },
  { code: "PICU", name: "PICU", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 5 },

  { code: "ER", name: "Emergency", usesRoomsDefault: false, schedulableByDefault: false, sortOrder: 10 },
  { code: "OPD", name: "OPD Clinics", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 11 },

  { code: "OT", name: "Operation Theatre", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 20 },
  { code: "PROC", name: "Procedure Unit", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 21 },
  { code: "ENDO", name: "Endoscopy", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 22 },
  { code: "CATH", name: "Cath Lab", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 23 },

  { code: "DIAL", name: "Dialysis", usesRoomsDefault: false, schedulableByDefault: true, sortOrder: 30 },
  { code: "LAB", name: "Laboratory", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 40 },
  { code: "IMAG", name: "Imaging / Radiology", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 41 },

  { code: "PHARM", name: "Pharmacy", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 50 },
  { code: "STORE", name: "Stores", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 51 },
  { code: "CSSD", name: "CSSD", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 52 },

  { code: "BBNK", name: "Blood Bank", usesRoomsDefault: true, schedulableByDefault: false, sortOrder: 60 },
  { code: "LND", name: "Labour & Delivery", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 61 },
  { code: "DAYC", name: "Day Care", usesRoomsDefault: true, schedulableByDefault: true, sortOrder: 62 },
];

@Injectable()
export class InfrastructureSeedService implements OnModuleInit {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  async onModuleInit() {
    // Only run in dev seed mode
    if (process.env.AUTH_DEV_SEED !== "true") return;

    // Seed unit types
    for (const ut of UNIT_TYPES) {
      await this.prisma.unitTypeCatalog.upsert({
        where: { code: ut.code },
        update: {
          name: ut.name,
          usesRoomsDefault: ut.usesRoomsDefault,
          schedulableByDefault: ut.schedulableByDefault,
          sortOrder: ut.sortOrder,
          isActive: true,
        },
        create: {
          code: ut.code,
          name: ut.name,
          usesRoomsDefault: ut.usesRoomsDefault,
          schedulableByDefault: ut.schedulableByDefault,
          sortOrder: ut.sortOrder,
          isActive: true,
        },
      });
    }

    // Seed policy definition + strict baseline (BLOCK at scheduling time)
    const def = await this.prisma.policyDefinition.upsert({
      where: { code: INFRA_POLICY.PROCEDURE_PRECHECK },
      update: {
        name: "Procedure Pre-check Policy",
        type: "INFRA",
        description: "Controls consent/anesthesia/checklist enforcement at scheduling and execution.",
      },
      create: {
        code: INFRA_POLICY.PROCEDURE_PRECHECK,
        name: "Procedure Pre-check Policy",
        type: "INFRA",
        description: "Controls consent/anesthesia/checklist enforcement at scheduling and execution.",
      },
      select: { id: true },
    });

    // Ensure one approved global baseline exists
    const hasApproved = await this.prisma.policyVersion.findFirst({
      where: { policyId: def.id, scope: "GLOBAL", status: "APPROVED" },
      select: { id: true },
    });

    if (!hasApproved) {
      await this.prisma.policyVersion.create({
        data: {
          policyId: def.id,
          scope: "GLOBAL",
          version: 1,
          status: "APPROVED",
          effectiveAt: new Date(),
          applyToAllBranches: true,
          payload: {
            scheduling: { consent: "BLOCK", anesthesia: "BLOCK", checklist: "BLOCK" },
          },
        },
      });
    }
  }
}
