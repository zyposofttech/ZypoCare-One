import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { PERM, ROLE } from "./iam.constants";
import { hashPassword } from "./password.util";
import { PERMISSIONS, normalizePermCode } from "./rbac/permission-catalog";

@Injectable()
export class IamSeedService implements OnModuleInit {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  async onModuleInit() {
    if (process.env.AUTH_DEV_SEED !== "true") return;

    const seedBranches = [
      { code: "BLR-HQ", name: "ZypoCare Hospital – Central Campus", city: "Bengaluru", gstNumber: "29ABCDE1234F1Z5" },
      { code: "BLR-EC", name: "ZypoCare Hospital – Electronic City Campus", city: "Bengaluru", gstNumber: "29ABCDE1234F2Z4" },
    ];

    for (const b of seedBranches) {
      await this.prisma.branch.upsert({
        where: { code: b.code },
        update: { name: b.name, city: b.city, gstNumber: b.gstNumber },
        create: b,
      });
    }

    // ✅ Permission catalog is the SINGLE source-of-truth (no drift)
    const permissions = PERMISSIONS.map((p) => ({
      code: normalizePermCode(p.code),
      name: p.name,
      category: p.category,
      description: p.description ?? null,
    }));

    // Convenience: group permission codes by prefix (keeps role definitions readable)
    const INFRA_ALL = Object.values(PERM).filter((c) => c.startsWith("INFRA_"));
    const OT_ALL = Object.values(PERM).filter((c) => c.startsWith("ot."));

    // Staff ops pack (enterprise onboarding + governance)
    const STAFF_OPS = [
      PERM.STAFF_READ,
      PERM.STAFF_CREATE,
      PERM.STAFF_UPDATE,
      PERM.STAFF_ASSIGNMENT_CREATE,
      PERM.STAFF_ASSIGNMENT_UPDATE,
      PERM.STAFF_ASSIGNMENT_END,
      PERM.STAFF_PROVISION_USER_PREVIEW,
      PERM.STAFF_PROVISION_USER,
      PERM.STAFF_CREDENTIAL_CREATE,
      PERM.STAFF_CREDENTIAL_UPDATE,
      PERM.STAFF_IDENTIFIER_CREATE,
      PERM.STAFF_IDENTIFIER_DELETE,
      PERM.STAFF_DEDUPE_PREVIEW,
      PERM.STAFF_SUSPEND,
      PERM.STAFF_REACTIVATE,
      PERM.STAFF_OFFBOARD,
      PERM.STAFF_AUDIT_READ,
      PERM.STAFF_REPORTS_READ,
    ].map(normalizePermCode);

    for (const p of permissions) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, category: p.category, description: p.description },
        create: { ...p },
      });
    }

    const KNOWN = new Set(permissions.map((x) => x.code));

    const keepKnown = (codes: string[]) =>
      codes
        .map((c) => normalizePermCode(c))
        .filter((c) => KNOWN.has(c));

    const isReadCode = (code: string) =>
      code.endsWith("_READ") || code.endsWith(".read");

    const pickReadByRegex = (re: RegExp) =>
      permissions
        .map((p) => p.code)
        .filter((c) => isReadCode(c) && re.test(c));

    // Conservative baseline for starter clinical/non-clinical roles:
    // - Enough for app shell + basic reference lookups (no create/update)
    const STARTER_BASE_READ = keepKnown([
      PERM.IAM_ME_READ,
      PERM.BRANCH_READ,

      PERM.FACILITY_CATALOG_READ,
      PERM.BRANCH_FACILITY_READ,

      PERM.DEPARTMENT_READ,
      PERM.DEPARTMENT_SPECIALTY_READ,

      PERM.SPECIALTY_READ,
    ]);

    const STARTER_ROLE_CODES = {
      DOCTOR: "DOCTOR",
      NURSE: "NURSE",
      TECHNICIAN: "TECHNICIAN",
      PHARMACIST: "PHARMACIST",
      BILLING_CLERK: "BILLING_CLERK",
      FRONT_OFFICE: "FRONT_OFFICE",
      ACCOUNTS_FINANCE: "ACCOUNTS_FINANCE",
      MRD: "MRD",
    } as const;

    const resolveStarterPerms = (code: string) => {
      // Always start with baseline read-only
      const base = [...STARTER_BASE_READ];

      // Optional “smart” enrichment: if you already have these permission families in catalog,
      // add READ-only ones by pattern. If none exist, this adds nothing (safe).
      if (code === STARTER_ROLE_CODES.TECHNICIAN) {
        base.push(...pickReadByRegex(/DIAG|DIAGNOSTIC|LAB|RADIO|PACS/i));
      }

      if (code === STARTER_ROLE_CODES.PHARMACIST) {
        base.push(...pickReadByRegex(/PHARM|DRUG|MEDICINE|INVENTORY|STOCK/i));
      }

      if (code === STARTER_ROLE_CODES.BILLING_CLERK) {
        base.push(...pickReadByRegex(/BILL|CHARGE|TARIFF|TAX|INVOICE|RECEIPT|PAYMENT|AR|DENIAL/i));
      }

      if (code === STARTER_ROLE_CODES.ACCOUNTS_FINANCE) {
        base.push(...pickReadByRegex(/FINANCE|ACCOUNT|LEDGER|PAYMENT|AR|AP|REVENUE/i));
      }

      if (code === STARTER_ROLE_CODES.FRONT_OFFICE) {
        base.push(...pickReadByRegex(/FRONT|RECEPTION|REGISTRATION|APPOINT|QUEUE|OPD/i));
      }

      if (code === STARTER_ROLE_CODES.MRD) {
        base.push(...pickReadByRegex(/MRD|RECORD|DOCUMENT|EMR|EHR|DISCHARGE/i));
      }

      // Doctor/Nurse stay conservative until clinical modules land
      return Array.from(new Set(base));
    };

    const roleTemplates = [
      // ---------------- SYSTEM ROLES ----------------
      {
        code: ROLE.SUPER_ADMIN,
        name: "Super Admin",
        scope: "GLOBAL" as const,
        desc: "Global system administrator",
        isSystem: true,
      },
      {
        code: ROLE.CORPORATE_ADMIN,
        name: "Corporate Admin",
        scope: "GLOBAL" as const,
        desc: "Enterprise owner (multi-branch ops; no RBAC/governance design by default)",
        isSystem: true,
      },
      {
        code: ROLE.BRANCH_ADMIN,
        name: "Branch Admin",
        scope: "BRANCH" as const,
        desc: "Branch configuration and user onboarding",
        isSystem: true,
      },
      {
        code: ROLE.IT_ADMIN,
        name: "IT Admin",
        scope: "BRANCH" as const,
        desc: "Branch IT operations (user resets/activation)",
        isSystem: true,
      },

      // ---------------- STAFF/HR OPS ----------------
      {
        code: ROLE.HR_ADMIN,
        name: "HR / Staff Admin",
        scope: "BRANCH" as const,
        desc: "Staff directory onboarding, assignments, credentialing, and user provisioning",
        isSystem: true,
      },

      // ---------------- STARTER PACK ROLES (Phase-1 practical) ----------------
      {
        code: STARTER_ROLE_CODES.DOCTOR,
        name: "Doctor",
        scope: "BRANCH" as const,
        desc: "Starter pack: Doctor (conservative read-only until clinical modules land)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.NURSE,
        name: "Nurse",
        scope: "BRANCH" as const,
        desc: "Starter pack: Nurse (conservative read-only until nursing workflows land)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.TECHNICIAN,
        name: "Technician (Lab/Radiology)",
        scope: "BRANCH" as const,
        desc: "Starter pack: Technician (read-only; expands as diagnostics modules land)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.PHARMACIST,
        name: "Pharmacist",
        scope: "BRANCH" as const,
        desc: "Starter pack: Pharmacist (read-only; expands as pharmacy/inventory modules land)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.BILLING_CLERK,
        name: "Billing Clerk",
        scope: "BRANCH" as const,
        desc: "Starter pack: Billing Clerk (read-only until billing module permissions finalize)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.FRONT_OFFICE,
        name: "Front Office / Reception",
        scope: "BRANCH" as const,
        desc: "Starter pack: Front Office (read-only until registration/OPD modules land)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.ACCOUNTS_FINANCE,
        name: "Accounts / Finance",
        scope: "BRANCH" as const,
        desc: "Starter pack: Accounts/Finance (read-only; expands with finance controls)",
        isSystem: true,
        isStarter: true,
      },
      {
        code: STARTER_ROLE_CODES.MRD,
        name: "Medical Records (MRD)",
        scope: "BRANCH" as const,
        desc: "Starter pack: MRD (read-only; expands with records and compliance workflows)",
        isSystem: true,
        isStarter: true,
      },
    ] as const;

    for (const r of roleTemplates) {
      const tpl = await this.prisma.roleTemplate.upsert({
        where: { code: r.code },
        update: { name: r.name, scope: r.scope, description: r.desc, isSystem: (r as any).isSystem ?? false },
        create: { code: r.code, name: r.name, scope: r.scope, description: r.desc, isSystem: (r as any).isSystem ?? false },
      });

      const existingV1 = await this.prisma.roleTemplateVersion.findFirst({
        where: { roleTemplateId: tpl.id, version: 1 },
      });

      const v1 =
        existingV1 ??
        (await this.prisma.roleTemplateVersion.create({
          data: {
            roleTemplateId: tpl.id,
            version: 1,
            status: "ACTIVE",
            notes: (r as any).isStarter ? "Starter pack v1 (conservative)" : "Initial seed v1",
          },
        }));

      // Resolve permission codes for this role
      let permCodes: string[] = [];

      if (r.code === ROLE.SUPER_ADMIN) {
        permCodes = permissions.map((x) => x.code);
      } else if (r.code === ROLE.CORPORATE_ADMIN) {
        permCodes = [
          PERM.BRANCH_READ,

          PERM.IAM_USER_READ,
          PERM.IAM_ROLE_READ,
          PERM.IAM_PERMISSION_READ,
          PERM.IAM_AUDIT_READ,

          PERM.FACILITY_CATALOG_READ,
          PERM.FACILITY_CATALOG_CREATE,
          PERM.BRANCH_FACILITY_READ,
          PERM.BRANCH_FACILITY_UPDATE,

          PERM.DEPARTMENT_READ,
          PERM.DEPARTMENT_CREATE,
          PERM.DEPARTMENT_UPDATE,
          PERM.DEPARTMENT_ASSIGN_DOCTORS,

          PERM.DEPARTMENT_SPECIALTY_READ,
          PERM.DEPARTMENT_SPECIALTY_UPDATE,

          PERM.SPECIALTY_READ,
          PERM.SPECIALTY_CREATE,
          PERM.SPECIALTY_UPDATE,

          // Staff directory ops (enterprise)
          ...STAFF_OPS,
          PERM.STAFF_MERGE_PREVIEW,
          PERM.STAFF_MERGE,

          ...INFRA_ALL,
          ...OT_ALL,
        ].map(normalizePermCode);
      } else if (r.code === ROLE.BRANCH_ADMIN) {
        permCodes = [
          PERM.BRANCH_READ,

          PERM.IAM_USER_READ,
          PERM.IAM_USER_CREATE,
          PERM.IAM_USER_UPDATE,

          PERM.IAM_ROLE_READ,
          PERM.IAM_PERMISSION_READ,
          PERM.IAM_AUDIT_READ,

          PERM.FACILITY_CATALOG_READ,
          PERM.BRANCH_FACILITY_READ,
          PERM.BRANCH_FACILITY_UPDATE,

          PERM.DEPARTMENT_READ,
          PERM.DEPARTMENT_CREATE,
          PERM.DEPARTMENT_UPDATE,
          PERM.DEPARTMENT_ASSIGN_DOCTORS,

          PERM.DEPARTMENT_SPECIALTY_READ,
          PERM.DEPARTMENT_SPECIALTY_UPDATE,

          PERM.SPECIALTY_READ,
          PERM.SPECIALTY_CREATE,
          PERM.SPECIALTY_UPDATE,

          // Staff onboarding + access provisioning
          ...STAFF_OPS,

          // Diagnostics configuration (branch-level)
          PERM.INFRA_DIAGNOSTICS_READ,
          PERM.INFRA_DIAGNOSTICS_CREATE,
          PERM.INFRA_DIAGNOSTICS_UPDATE,
          PERM.INFRA_DIAGNOSTICS_DELETE,

          // infra setup at branch level
          PERM.INFRA_LOCATION_READ,
          PERM.INFRA_LOCATION_CREATE,
          PERM.INFRA_LOCATION_UPDATE,
          PERM.INFRA_LOCATION_REVISE,
          PERM.INFRA_LOCATION_RETIRE,

          PERM.INFRA_UNITTYPE_READ,
          PERM.INFRA_UNITTYPE_UPDATE,

          PERM.INFRA_UNIT_READ,
          PERM.INFRA_UNIT_CREATE,
          PERM.INFRA_UNIT_UPDATE,

          PERM.INFRA_ROOM_READ,
          PERM.INFRA_ROOM_CREATE,
          PERM.INFRA_ROOM_UPDATE,

          PERM.INFRA_RESOURCE_READ,
          PERM.INFRA_RESOURCE_CREATE,
          PERM.INFRA_RESOURCE_UPDATE,
          PERM.INFRA_RESOURCE_STATE_UPDATE,

          PERM.INFRA_GOLIVE_READ,
          PERM.INFRA_GOLIVE_RUN,
        ].map(normalizePermCode);
      } else if (r.code === ROLE.HR_ADMIN) {
        permCodes = [
          ...STARTER_BASE_READ,
          ...STAFF_OPS,
        ].map(normalizePermCode);
      } else if (r.code === ROLE.IT_ADMIN) {
        permCodes = [
          PERM.BRANCH_READ,

          PERM.IAM_USER_READ,
          PERM.IAM_USER_UPDATE,
          PERM.IAM_USER_RESET_PASSWORD,

          PERM.IAM_ROLE_READ,
          PERM.IAM_PERMISSION_READ,
          PERM.IAM_AUDIT_READ,

          PERM.FACILITY_CATALOG_READ,
          PERM.BRANCH_FACILITY_READ,
          PERM.DEPARTMENT_READ,
          PERM.DEPARTMENT_SPECIALTY_READ,
          PERM.SPECIALTY_READ,
          // Staff directory (read-only)
          PERM.STAFF_READ,

          // limited infra ops
          PERM.INFRA_LOCATION_READ,
          PERM.INFRA_EQUIPMENT_READ,
          PERM.INFRA_FIXIT_READ,
        ].map(normalizePermCode);
      } else {
        // ✅ Starter pack roles
        permCodes = resolveStarterPerms(r.code);
      }

      // Keep only codes that exist in catalog (prevents seed failures if catalog changes)
      permCodes = keepKnown(permCodes);

      const perms = await this.prisma.permission.findMany({ where: { code: { in: permCodes } } });

      // Keep CORPORATE_ADMIN permissions aligned to intended minimal set (seed acts as source-of-truth).
      if (r.code === ROLE.CORPORATE_ADMIN) {
        const allowedIds = perms.map((x) => x.id);
        await this.prisma.roleTemplatePermission.deleteMany({
          where: { roleVersionId: v1.id, permissionId: { notIn: allowedIds } },
        });
      }

      for (const p of perms) {
        await this.prisma.roleTemplatePermission.upsert({
          where: { roleVersionId_permissionId: { roleVersionId: v1.id, permissionId: p.id } },
          update: {},
          create: { roleVersionId: v1.id, permissionId: p.id },
        });
      }
    }

    // ✅ Ensure CORPORATE_ADMIN users have roleVersionId set (prevents empty permissions)
    const corpTpl = await this.prisma.roleTemplate.findUnique({ where: { code: ROLE.CORPORATE_ADMIN } });
    const corpV1 = corpTpl ? await this.prisma.roleTemplateVersion.findFirst({ where: { roleTemplateId: corpTpl.id, version: 1 } }) : null;

    if (corpV1) {
      await this.prisma.user.updateMany({
        where: { role: ROLE.CORPORATE_ADMIN, OR: [{ roleVersionId: null }, { roleVersionId: undefined as any }] },
        data: { roleVersionId: corpV1.id },
      });
    }

    // ✅ Ensure SUPER_ADMIN users have roleVersionId set (prevents empty permissions)
    const superTpl = await this.prisma.roleTemplate.findUnique({ where: { code: ROLE.SUPER_ADMIN } });
    const superV1 = superTpl ? await this.prisma.roleTemplateVersion.findFirst({ where: { roleTemplateId: superTpl.id, version: 1 } }) : null;

    if (superV1) {
      await this.prisma.user.updateMany({
        where: { role: ROLE.SUPER_ADMIN, OR: [{ roleVersionId: null }, { roleVersionId: undefined as any }] },
        data: { roleVersionId: superV1.id },
      });

      // dev seed identity (optional)
      const email = "superadmin@zypocare.com";
      const temp = "ChangeMe@123";
      const hash = hashPassword(temp);

      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await this.prisma.user.create({
          data: {
            email,
            name: "ZypoCare Super Admin",
            role: ROLE.SUPER_ADMIN,
            roleVersionId: superV1.id,
            passwordHash: hash,
            mustChangePassword: false,
            isActive: true,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { email },
          data: {
            role: ROLE.SUPER_ADMIN,
            roleVersionId: superV1.id,
            passwordHash: existing.passwordHash ?? hash,
            mustChangePassword: false,
            isActive: true,
          },
        });
      }
    }
  }
}
