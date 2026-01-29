import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { PERM, ROLE } from "./iam.constants";
import { hashPassword } from "./password.util";

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

    // ✅ IMPORTANT: Seed ALL permission codes that controllers use
    const permissions = [
      // Branch Management
      { code: PERM.BRANCH_READ, name: "Read branches", category: "Branch" },
      { code: PERM.BRANCH_CREATE, name: "Create branches", category: "Branch" },
      { code: PERM.BRANCH_UPDATE, name: "Update branches", category: "Branch" },
      { code: PERM.BRANCH_DELETE, name: "Delete branches", category: "Branch" },

      // IAM
      { code: PERM.IAM_USER_READ, name: "Read users", category: "IAM" },
      { code: PERM.IAM_USER_CREATE, name: "Create users", category: "IAM" },
      { code: PERM.IAM_USER_UPDATE, name: "Update users", category: "IAM" },
      { code: PERM.IAM_USER_RESET_PASSWORD, name: "Reset user passwords", category: "IAM" },
      { code: PERM.IAM_ROLE_READ, name: "Read roles", category: "IAM" },
      { code: PERM.IAM_PERMISSION_READ, name: "Read permissions", category: "IAM" },
      { code: PERM.IAM_AUDIT_READ, name: "Read audit events", category: "IAM" },

      // Facility
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

      // Governance
      { code: PERM.GOV_POLICY_READ, name: "Read policies", category: "Governance" },
      { code: PERM.GOV_POLICY_GLOBAL_DRAFT, name: "Draft global policies", category: "Governance" },
      { code: PERM.GOV_POLICY_BRANCH_OVERRIDE_DRAFT, name: "Draft branch overrides", category: "Governance" },
      { code: PERM.GOV_POLICY_SUBMIT, name: "Submit policy changes", category: "Governance" },
      { code: PERM.GOV_POLICY_APPROVE, name: "Approve policy changes", category: "Governance" },
      { code: PERM.GOV_POLICY_AUDIT_READ, name: "Read policy audit", category: "Governance" },

      // ✅ Infrastructure / Setup Studio (THIS FIXES YOUR ISSUE)
      { code: PERM.INFRA_LOCATION_READ, name: "Read locations", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_CREATE, name: "Create locations", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_UPDATE, name: "Update locations", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_REVISE, name: "Revise locations (effective-dated)", category: "Infrastructure" },
      { code: PERM.INFRA_LOCATION_RETIRE, name: "Retire locations (end-date)", category: "Infrastructure" },

      { code: PERM.INFRA_UNITTYPE_READ, name: "Read unit types", category: "Infrastructure" },
      { code: PERM.INFRA_UNITTYPE_UPDATE, name: "Update unit types", category: "Infrastructure" },

      { code: PERM.INFRA_UNIT_READ, name: "Read units", category: "Infrastructure" },
      { code: PERM.INFRA_UNIT_CREATE, name: "Create units", category: "Infrastructure" },
      { code: PERM.INFRA_UNIT_UPDATE, name: "Update units", category: "Infrastructure" },
      { code: PERM.INFRA_UNIT_DELETE, name: "Delete units", category: "Infrastructure" },
      { code: PERM.INFRA_ROOM_READ, name: "Read rooms", category: "Infrastructure" },
      { code: PERM.INFRA_ROOM_CREATE, name: "Create rooms", category: "Infrastructure" },
      { code: PERM.INFRA_ROOM_UPDATE, name: "Update rooms", category: "Infrastructure" },

      { code: PERM.INFRA_RESOURCE_READ, name: "Read resources", category: "Infrastructure" },
      { code: PERM.INFRA_RESOURCE_CREATE, name: "Create resources", category: "Infrastructure" },
      { code: PERM.INFRA_RESOURCE_UPDATE, name: "Update resources", category: "Infrastructure" },
      { code: PERM.INFRA_RESOURCE_STATE_UPDATE, name: "Update resource state", category: "Infrastructure" },

      { code: PERM.INFRA_EQUIPMENT_READ, name: "Read equipment", category: "Infrastructure" },
      { code: PERM.INFRA_EQUIPMENT_CREATE, name: "Create equipment", category: "Infrastructure" },
      { code: PERM.INFRA_EQUIPMENT_UPDATE, name: "Update equipment", category: "Infrastructure" },

      { code: PERM.INFRA_SERVICE_READ, name: "Read infra services", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_CREATE, name: "Create infra services", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_UPDATE, name: "Update infra services", category: "Infrastructure" },

      // Service Catalogues
      { code: PERM.INFRA_SERVICE_CATALOGUE_CREATE, name: "Create service catalogues", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_CATALOGUE_READ, name: "Read service catalogues", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_CATALOGUE_UPDATE, name: "Update service catalogues", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_CATALOGUE_PUBLISH, name: "Publish service catalogues", category: "Infrastructure" },

      // Service Packages
      { code: PERM.INFRA_SERVICE_PACKAGE_CREATE, name: "Create service packages", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_PACKAGE_READ, name: "Read service packages", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_PACKAGE_UPDATE, name: "Update service packages", category: "Infrastructure" },
      { code: PERM.INFRA_SERVICE_PACKAGE_PUBLISH, name: "Publish service packages", category: "Infrastructure" },

      // Order Sets
      { code: PERM.INFRA_ORDER_SET_CREATE, name: "Create order sets", category: "Infrastructure" },
      { code: PERM.INFRA_ORDER_SET_READ, name: "Read order sets", category: "Infrastructure" },
      { code: PERM.INFRA_ORDER_SET_UPDATE, name: "Update order sets", category: "Infrastructure" },
      { code: PERM.INFRA_ORDER_SET_PUBLISH, name: "Publish order sets", category: "Infrastructure" },

      // Service Library / Code Sets
      { code: PERM.INFRA_CODE_SET_CREATE, name: "Create code sets", category: "Infrastructure" },
      { code: PERM.INFRA_CODE_SET_READ, name: "Read code sets", category: "Infrastructure" },
      { code: PERM.INFRA_CODE_SET_UPDATE, name: "Update code sets", category: "Infrastructure" },

      { code: PERM.INFRA_CHARGE_MASTER_READ, name: "Read charge master", category: "Infrastructure" },
      { code: PERM.INFRA_CHARGE_MASTER_CREATE, name: "Create charge master", category: "Infrastructure" },
      { code: PERM.INFRA_CHARGE_MASTER_UPDATE, name: "Update charge master", category: "Infrastructure" },

      { code: PERM.INFRA_SERVICE_MAPPING_UPDATE, name: "Update service ↔ charge mapping", category: "Infrastructure" },
      { code: PERM.INFRA_FIXIT_READ, name: "Read fix-it tickets", category: "Infrastructure" },
      { code: PERM.INFRA_FIXIT_UPDATE, name: "Update fix-it tickets", category: "Infrastructure" },

      { code: PERM.INFRA_IMPORT_VALIDATE, name: "Validate imports", category: "Infrastructure" },
      { code: PERM.INFRA_IMPORT_COMMIT, name: "Commit imports", category: "Infrastructure" },

      { code: PERM.INFRA_SCHED_READ, name: "Read infra bookings", category: "Infrastructure" },
      { code: PERM.INFRA_SCHED_CREATE, name: "Create infra bookings", category: "Infrastructure" },
      { code: PERM.INFRA_SCHED_CANCEL, name: "Cancel infra bookings", category: "Infrastructure" },

      { code: PERM.INFRA_GOLIVE_READ, name: "Read go-live checks", category: "Infrastructure" },
      { code: PERM.INFRA_GOLIVE_RUN, name: "Run go-live checks", category: "Infrastructure" },
      { code: PERM.OT_SUITE_CREATE, name: "Create OT suites", category: "OT" },
      { code: PERM.OT_SUITE_READ, name: "Read OT suites", category: "OT" },
      { code: PERM.OT_SUITE_UPDATE, name: "Update OT suites", category: "OT" },
      { code: PERM.OT_SUITE_DELETE, name: "Delete OT suites", category: "OT" },
      { code: PERM.OT_SPACE_CREATE, name: "Create OT spaces", category: "OT" },
      { code: PERM.OT_SPACE_UPDATE, name: "Update OT spaces", category: "OT" },
      { code: PERM.OT_SPACE_DELETE, name: "Delete OT spaces", category: "OT" },
      { code: PERM.OT_TABLE_CREATE, name: "Create OT tables", category: "OT" },
      { code: PERM.OT_TABLE_UPDATE, name: "Update OT tables", category: "OT" },
      { code: PERM.OT_TABLE_DELETE, name: "Delete OT tables", category: "OT" },
      { code: PERM.OT_EQUIPMENT_CREATE, name: "Create OT equipment", category: "OT" },
      { code: PERM.OT_EQUIPMENT_UPDATE, name: "Update OT equipment", category: "OT" },
      { code: PERM.OT_EQUIPMENT_DELETE, name: "Delete OT equipment", category: "OT" },  
      { code: PERM.OT_SUITE_READ, name: "Read OT suite readiness", category: "OT" },
      { code: PERM.OT_SUITE_UPDATE, name: "Update OT suite readiness", category: "OT" },
      { code: PERM.OT_SUITE_DELETE, name: "Delete OT suite readiness", category: "OT" },
      { code: PERM.OT_SPACE_UPDATE, name: "Update OT space readiness", category: "OT" },
      { code: PERM.OT_SPACE_DELETE, name: "Delete OT space readiness", category: "OT" },
  
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

      const existingV1 = await this.prisma.roleTemplateVersion.findFirst({
        where: { roleTemplateId: tpl.id, version: 1 },
      });

      const v1 =
        existingV1 ??
        (await this.prisma.roleTemplateVersion.create({
          data: { roleTemplateId: tpl.id, version: 1, status: "ACTIVE", notes: "Initial seed v1" },
        }));

      // ✅ SUPER_ADMIN gets EVERYTHING we seeded
      const permCodes =
        r.code === ROLE.SUPER_ADMIN
          ? permissions.map((x) => x.code)
          : r.code === ROLE.BRANCH_ADMIN
            ? [
                PERM.BRANCH_READ,
                PERM.IAM_USER_READ, PERM.IAM_USER_CREATE, PERM.IAM_USER_UPDATE,
                PERM.IAM_ROLE_READ, PERM.IAM_PERMISSION_READ, PERM.IAM_AUDIT_READ,

                PERM.FACILITY_CATALOG_READ,
                PERM.BRANCH_FACILITY_READ, PERM.BRANCH_FACILITY_UPDATE,
                PERM.DEPARTMENT_READ, PERM.DEPARTMENT_CREATE, PERM.DEPARTMENT_UPDATE, PERM.DEPARTMENT_ASSIGN_DOCTORS,
                PERM.DEPARTMENT_SPECIALTY_READ, PERM.DEPARTMENT_SPECIALTY_UPDATE,
                PERM.SPECIALTY_READ, PERM.SPECIALTY_CREATE, PERM.SPECIALTY_UPDATE,
                PERM.STAFF_READ,

                // infra setup at branch level
                PERM.INFRA_LOCATION_READ, PERM.INFRA_LOCATION_CREATE, PERM.INFRA_LOCATION_UPDATE, PERM.INFRA_LOCATION_REVISE, PERM.INFRA_LOCATION_RETIRE,
                PERM.INFRA_UNITTYPE_READ, PERM.INFRA_UNITTYPE_UPDATE,
                PERM.INFRA_UNIT_READ, PERM.INFRA_UNIT_CREATE, PERM.INFRA_UNIT_UPDATE,
                PERM.INFRA_ROOM_READ, PERM.INFRA_ROOM_CREATE, PERM.INFRA_ROOM_UPDATE,
                PERM.INFRA_RESOURCE_READ, PERM.INFRA_RESOURCE_CREATE, PERM.INFRA_RESOURCE_UPDATE, PERM.INFRA_RESOURCE_STATE_UPDATE,
                PERM.INFRA_GOLIVE_READ, PERM.INFRA_GOLIVE_RUN,
              ]
            : [
                PERM.BRANCH_READ,
                PERM.IAM_USER_READ, PERM.IAM_USER_UPDATE, PERM.IAM_USER_RESET_PASSWORD,
                PERM.IAM_ROLE_READ, PERM.IAM_PERMISSION_READ, PERM.IAM_AUDIT_READ,

                PERM.FACILITY_CATALOG_READ,
                PERM.BRANCH_FACILITY_READ,
                PERM.DEPARTMENT_READ,
                PERM.DEPARTMENT_SPECIALTY_READ,
                PERM.SPECIALTY_READ,
                PERM.STAFF_READ,

                // limited infra ops
                PERM.INFRA_LOCATION_READ,
                PERM.INFRA_EQUIPMENT_READ,
                PERM.INFRA_FIXIT_READ,
              ];

      const perms = await this.prisma.permission.findMany({ where: { code: { in: permCodes } } });

      for (const p of perms) {
        await this.prisma.roleTemplatePermission.upsert({
          where: { roleVersionId_permissionId: { roleVersionId: v1.id, permissionId: p.id } },
          update: {},
          create: { roleVersionId: v1.id, permissionId: p.id },
        });
      }
    }

    // ✅ Ensure SUPER_ADMIN users have roleVersionId set (prevents empty permissions)
    const superTpl = await this.prisma.roleTemplate.findUnique({ where: { code: ROLE.SUPER_ADMIN } });
    const superV1 = superTpl
      ? await this.prisma.roleTemplateVersion.findFirst({ where: { roleTemplateId: superTpl.id, version: 1 } })
      : null;

    if (superV1) {
      await this.prisma.user.updateMany({
        where: { role: ROLE.SUPER_ADMIN, OR: [{ roleVersionId: null }, { roleVersionId: undefined as any }] },
        data: { roleVersionId: superV1.id },
      });

      // dev seed identity (optional)
      const email = "superadmin@zypocare.local";
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
