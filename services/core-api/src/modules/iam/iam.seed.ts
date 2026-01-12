import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";
import { PERM, ROLE } from "./iam.constants";
import { generateTempPassword, hashPassword } from "./password.util";

@Injectable()
export class IamSeedService implements OnModuleInit {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) { }

  async onModuleInit() {
    if (process.env.AUTH_DEV_SEED !== "true") return;
    const seedBranches = [
      {
        code: "BLR-HQ",
        name: "ExcelCare Hospital – Central Campus",
        city: "Bengaluru",
        gstNumber: "29ABCDE1234F1Z5",
      },
      {
        code: "BLR-EC",
        name: "ExcelCare Hospital – Electronic City Campus",
        city: "Bengaluru",
        gstNumber: "29ABCDE1234F2Z4",
      },
    ];

    for (const b of seedBranches) {
      await this.prisma.branch.upsert({
        where: { code: b.code },
        update: { name: b.name, city: b.city, gstNumber: b.gstNumber },
        create: b,
      });
    }
    const permissions = [
      { code: PERM.IAM_USER_READ, name: "Read users", category: "IAM" },
      { code: PERM.IAM_USER_CREATE, name: "Create users", category: "IAM" },
      { code: PERM.IAM_USER_UPDATE, name: "Update users", category: "IAM" },
      { code: PERM.IAM_USER_RESET_PASSWORD, name: "Reset user passwords", category: "IAM" },
      { code: PERM.IAM_ROLE_READ, name: "Read roles", category: "IAM" },
      { code: PERM.IAM_PERMISSION_READ, name: "Read permissions", category: "IAM" },
      { code: PERM.IAM_AUDIT_READ, name: "Read audit events", category: "IAM" },
      // Facility Management
      { code: PERM.FACILITY_CATALOG_READ, name: "Read facility catalog", category: "Facility" },
      { code: PERM.FACILITY_CATALOG_CREATE, name: "Create facility catalog items", category: "Facility" },

      { code: PERM.BRANCH_FACILITY_READ, name: "Read branch facilities", category: "Facility" },
      { code: PERM.BRANCH_FACILITY_UPDATE, name: "Update branch facilities", category: "Facility" },

      { code: PERM.DEPARTMENT_READ, name: "Read departments", category: "Facility" },
      { code: PERM.DEPARTMENT_CREATE, name: "Create departments", category: "Facility" },
      { code: PERM.DEPARTMENT_UPDATE, name: "Update departments", category: "Facility" },
      { code: PERM.DEPARTMENT_ASSIGN_DOCTORS, name: "Assign doctors to departments", category: "Facility" },

      { code: PERM.DEPARTMENT_SPECIALTY_READ, name: "Read department ↔ specialty mappings", category: "Facility" },
      { code: PERM.DEPARTMENT_SPECIALTY_UPDATE, name: "Update department ↔ specialty mappings", category: "Facility" },

      { code: PERM.SPECIALTY_READ, name: "Read specialties", category: "Facility" },
      { code: PERM.SPECIALTY_CREATE, name: "Create specialties", category: "Facility" },
      { code: PERM.SPECIALTY_UPDATE, name: "Update specialties", category: "Facility" },

      { code: PERM.STAFF_READ, name: "Read staff", category: "Facility" },
      // Policy Governance
      { code: PERM.GOV_POLICY_READ, name: "Read policies", category: "Governance" },
      { code: PERM.GOV_POLICY_GLOBAL_DRAFT, name: "Draft global policies", category: "Governance" },
      { code: PERM.GOV_POLICY_BRANCH_OVERRIDE_DRAFT, name: "Draft branch overrides", category: "Governance" },
      { code: PERM.GOV_POLICY_SUBMIT, name: "Submit policy changes", category: "Governance" },
      { code: PERM.GOV_POLICY_APPROVE, name: "Approve policy changes", category: "Governance" },
      { code: PERM.GOV_POLICY_AUDIT_READ, name: "Read policy audit", category: "Governance" },
      { code: PERM.INFRA_LOCATION_READ, name: "Read locations", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_CREATE, name: "Create locations", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_REVISE, name: "Revise locations (effective-dated)", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_RETIRE, name: "Retire locations (end-date)", category: "Infrastructure" },

    ];

    for (const p of permissions) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, category: p.category },
        create: { ...p },
      });
    }

    const roleTemplates = [
      { code: ROLE.SUPER_ADMIN, name: "Super Admin", scope: "GLOBAL" as const, desc: "Global system administrator" },
      { code: ROLE.BRANCH_ADMIN, name: "Branch Admin", scope: "BRANCH" as const, desc: "Branch configuration and user onboarding" },
      { code: ROLE.IT_ADMIN, name: "IT Admin", scope: "BRANCH" as const, desc: "Branch IT operations (user resets/activation)" },
    ];

    for (const r of roleTemplates) {
      const tpl = await this.prisma.roleTemplate.upsert({
        where: { code: r.code },
        update: { name: r.name, scope: r.scope, description: r.desc },
        create: { code: r.code, name: r.name, scope: r.scope, description: r.desc },
      });

      // ensure ACTIVE v1 exists
      const existingV1 = await this.prisma.roleTemplateVersion.findFirst({
        where: { roleTemplateId: tpl.id, version: 1 },
      });

      const v1 =
        existingV1 ??
        (await this.prisma.roleTemplateVersion.create({
          data: { roleTemplateId: tpl.id, version: 1, status: "ACTIVE", notes: "Initial seed v1" },
        }));

      // map permissions
      const permCodes =
        r.code === ROLE.SUPER_ADMIN
          ? permissions.map((x) => x.code)
          : r.code === ROLE.BRANCH_ADMIN
            ? [
              // existing IAM
              PERM.IAM_USER_READ, PERM.IAM_USER_CREATE, PERM.IAM_USER_UPDATE,
              PERM.IAM_ROLE_READ, PERM.IAM_PERMISSION_READ, PERM.IAM_AUDIT_READ,

              // facility setup
              PERM.FACILITY_CATALOG_READ,
              PERM.BRANCH_FACILITY_READ, PERM.BRANCH_FACILITY_UPDATE,
              PERM.DEPARTMENT_READ, PERM.DEPARTMENT_CREATE, PERM.DEPARTMENT_UPDATE, PERM.DEPARTMENT_ASSIGN_DOCTORS,
              PERM.DEPARTMENT_SPECIALTY_READ, PERM.DEPARTMENT_SPECIALTY_UPDATE,
              PERM.SPECIALTY_READ, PERM.SPECIALTY_CREATE, PERM.SPECIALTY_UPDATE,
              PERM.STAFF_READ,
            ]
            : [
              // IT_ADMIN (example: read-only facility config + IAM resets)
              PERM.IAM_USER_READ, PERM.IAM_USER_UPDATE, PERM.IAM_USER_RESET_PASSWORD,
              PERM.IAM_ROLE_READ, PERM.IAM_PERMISSION_READ, PERM.IAM_AUDIT_READ,

              PERM.FACILITY_CATALOG_READ,
              PERM.BRANCH_FACILITY_READ,
              PERM.DEPARTMENT_READ,
              PERM.DEPARTMENT_SPECIALTY_READ,
              PERM.SPECIALTY_READ,
              PERM.STAFF_READ,
              PERM.INFRA_LOCATION_READ,
              PERM.INFRA_LOCATION_CREATE,
              PERM.INFRA_LOCATION_REVISE,
              PERM.INFRA_LOCATION_RETIRE,

            ];


      const perms = await this.prisma.permission.findMany({ where: { code: { in: permCodes } } });

      // upsert grants
      for (const p of perms) {
        await this.prisma.roleTemplatePermission.upsert({
          where: { roleVersionId_permissionId: { roleVersionId: v1.id, permissionId: p.id } },
          update: {},
          create: { roleVersionId: v1.id, permissionId: p.id },
        });
      }
    }

    // Seed SUPER_ADMIN user (strictly for dev seed)
    const superTpl = await this.prisma.roleTemplate.findUnique({ where: { code: ROLE.SUPER_ADMIN } });
    const superV1 = superTpl
      ? await this.prisma.roleTemplateVersion.findFirst({ where: { roleTemplateId: superTpl.id, version: 1 } })
      : null;

    if (superV1) {
      const email = "superadmin@excelcare.local";
      const existing = await this.prisma.user.findUnique({ where: { email } });

      const temp = "ChangeMe@123";
      const hash = hashPassword(temp);

      if (!existing) {
        await this.prisma.user.create({
          data: {
            email,
            name: "ExcelCare Super Admin",
            role: ROLE.SUPER_ADMIN,
            roleVersionId: superV1.id,
            passwordHash: hash,
            mustChangePassword: true,
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
            mustChangePassword: true,
            isActive: true,
          },
        });
      }
    }
  }
}
