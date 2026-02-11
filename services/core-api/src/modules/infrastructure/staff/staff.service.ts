import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import crypto from "crypto";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import {
  StaffMergeDto,
  StaffMergePreviewDto,
  StaffOnboardDto,
  UpdateStaffDto,
  StaffAssignmentInputDto,
  UpdateStaffAssignmentDto,
  EndStaffAssignmentDto,
  StaffProvisionUserDto,
  StaffProvisionUserPreviewDto,
  StaffLinkUserDto,
  StaffUnlinkUserDto,
  StaffUsgAuthorizationDto,
  StaffSuspendDto,
  StaffOffboardDto,
  CreateStaffCredentialDto,
  UpdateStaffCredentialDto,
  StaffIdentifierInputDto,
  StaffCreateMasterDto,
  CreateStaffDocumentDto,
  UpdateStaffDocumentDto,
  VerifyStaffDocumentDto,
  AddStaffCredentialEvidenceDto,
  CreateStaffPrivilegeGrantDto,
  UpdateStaffPrivilegeGrantDto,
  UpsertStaffProviderProfileDto,
} from "./dto";
import { generateTempPassword, hashPassword } from "../../iam/password.util";
import { canonicalizeCode } from "../../../common/naming.util";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function safeJsonObject(v: any): Record<string, any> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, any>;
}

function stripSensitiveFromJson(obj: any): any {
  // Best-effort sanitization: remove keys we never want persisted as plaintext.
  // (Identifiers are stored as hash + last4 in StaffIdentifier.)
  const SENSITIVE_KEYS = new Set(["national_id", "aadhaar", "aadhar", "pan", "license_number", "registration_number"]);
  const walk = (x: any): any => {
    if (!x || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(walk);
    const out: any = {};
    for (const [k, v] of Object.entries(x)) {
      if (SENSITIVE_KEYS.has(String(k).toLowerCase())) continue;
      out[k] = walk(v);
    }
    return out;
  };
  return walk(obj);
}

function tryExtractStructuredFromNotes(notes?: string | null): any | null {
  if (!notes) return null;
  const t = String(notes).trim();
  if (!t) return null;

  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === "object" ? v : null;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(t);
  if (!parsed) {
    // If notes has leading text but contains JSON, attempt substring parse.
    const i = t.indexOf("{");
    const j = t.lastIndexOf("}");
    if (i >= 0 && j > i) parsed = tryParse(t.slice(i, j + 1));
  }
  if (!parsed) return null;

  const o = parsed as any;
  const keys = ["personal_details", "contact_details", "employment_details", "medical_details", "system_access"];
  const hit = keys.some((k) => o[k] && typeof o[k] === "object");
  return hit ? o : null;
}

function overlaps(aFrom: Date, aTo: Date | null, bFrom: Date, bTo: Date | null) {
  const aEnd = aTo ?? new Date("9999-12-31");
  const bEnd = bTo ?? new Date("9999-12-31");
  return aFrom <= bEnd && bFrom <= aEnd;
}

// ---------------- DPDP-safe identifier hashing ----------------

function getStaffIdPepper() {
  const pepper = (process.env.STAFF_ID_HASH_PEPPER || process.env.AUTH_HASH_PEPPER || "").trim();
  if (process.env.NODE_ENV === "production" && !pepper) {
    // In production, do not allow predictable hashing (prevents offline attacks).
    // Set STAFF_ID_HASH_PEPPER to a long random value.
    throw new Error("Missing STAFF_ID_HASH_PEPPER");
  }
  return pepper || "dev-pepper";
}

function normalizeIdentifierValue(type: string, raw: string): string {
  const v0 = String(raw ?? "").trim();
  if (!v0) return "";

  const upper = v0.toUpperCase();

  // Aadhaar: digits only (optionally allow spaces/dashes)
  if (type === "AADHAAR") {
    return upper.replace(/[^0-9]/g, "");
  }

  // PAN: remove spaces
  if (type === "PAN") {
    return upper.replace(/\s+/g, "");
  }

  // Passport / HPR_ID / OTHER: trim spaces only
  return upper.replace(/\s+/g, "");
}

function last4(value: string): string | null {
  const v = String(value ?? "");
  if (!v) return null;
  const t = v.length <= 4 ? v : v.slice(-4);
  return t || null;
}

function hashIdentifier(type: string, normalizedValue: string): string {
  const pepper = getStaffIdPepper();
  return crypto.createHmac("sha256", pepper).update(`${type}|${normalizedValue}`).digest("hex");
}
function guessNationalIdType(raw: string): "AADHAAR" | "PAN" | "PASSPORT" | "OTHER" {
  const v = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!v) return "OTHER";

  const digitsOnly = v.replace(/[^0-9]/g, "");
  if (digitsOnly.length === 12) return "AADHAAR";

  if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) return "PAN";

  if (/^[A-Z][0-9]{7}$/.test(v)) return "PASSPORT";

  return "OTHER";
}

@Injectable()
export class StaffService {
  constructor(private readonly ctx: InfraContextService) { }

  private allowedBranchIds(principal: Principal): string[] {
    if (principal.roleScope === "GLOBAL") return [];
    const ids = (principal as any).branchIds as string[] | undefined;
    if (Array.isArray(ids) && ids.length) return ids;
    return principal.branchId ? [principal.branchId] : [];
  }

  private assertCanOperateOnBranch(principal: Principal, branchId: string) {
    if (principal.roleScope === "GLOBAL") return;
    const allowed = this.allowedBranchIds(principal);
    if (!allowed.includes(branchId)) throw new ForbiddenException("Forbidden: branch access denied");
  }

  private async bumpAuthz(userId: string, tx: any) {
    await tx.user.update({
      where: { id: userId },
      data: { authzVersion: { increment: 1 } },
      select: { id: true },
    });
  }

  private normalizeDateRange(fromRaw?: string | null, toRaw?: string | null, defaultFromNow = true) {
    const from = parseDate(fromRaw ?? null) ?? (defaultFromNow ? new Date() : null);
    if (!from) throw new BadRequestException("effectiveFrom is required");
    const to = parseDate(toRaw ?? null);
    if (to && to.getTime() < from.getTime()) {
      throw new BadRequestException("effectiveTo must be >= effectiveFrom");
    }
    return { from, to };
  }

  private bindingActiveForAssignmentStatus(status: any): boolean {
    return status !== "SUSPENDED" && status !== "ENDED";
  }

  private normalizeStaffCategory(value?: string | null): "CLINICAL" | "NON_CLINICAL" | undefined {
    const v = String(value ?? "").trim().toUpperCase();
    if (!v) return undefined;
    if (v === "MEDICAL" || v === "CLINICAL") return "CLINICAL";
    if (v === "NON_MEDICAL" || v === "NON_CLINICAL") return "NON_CLINICAL";
    return undefined;
  }

  private async resolveRoleVersionIdForUser(tx: any, user: { id: string; role: string; roleVersionId?: string | null }) {
    if (user.roleVersionId) return user.roleVersionId;

    // Fallback: resolve the latest ACTIVE role template version by role code and store it on user
    const rv = await tx.roleTemplateVersion.findFirst({
      where: { roleTemplate: { code: user.role }, status: "ACTIVE" as any },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true },
    });
    if (!rv) throw new BadRequestException(`Cannot resolve roleVersionId for user role=${user.role}`);
    await tx.user.update({ where: { id: user.id }, data: { roleVersionId: rv.id } });
    return rv.id;
  }

  private async validateNoOverlapAgainstDb(
    tx: any,
    staffId: string,
    branchId: string,
    from: Date,
    to: Date | null,
    excludeAssignmentId?: string,
  ) {
    const existing = await tx.staffAssignment.findMany({
      where: {
        staffId,
        branchId,
        status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] as any },
        ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      },
      select: { id: true, effectiveFrom: true, effectiveTo: true },
      take: 200,
    });

    for (const e of existing) {
      if (overlaps(from, to, new Date(e.effectiveFrom), e.effectiveTo ? new Date(e.effectiveTo) : null)) {
        throw new BadRequestException(`Overlapping assignment exists for branch ${branchId}`);
      }
    }
  }

  private async upsertRoleBindingForAssignment(
    tx: any,
    user: { id: string; role: string; roleVersionId?: string | null },
    assignment: { id: string; branchId: string; isPrimary: boolean; status: any; effectiveFrom: Date; effectiveTo: Date | null },
  ) {
    const roleVersionId = await this.resolveRoleVersionIdForUser(tx, {
      id: user.id,
      role: user.role,
      roleVersionId: user.roleVersionId,
    });

    const isActive = this.bindingActiveForAssignmentStatus(assignment.status);

    if (assignment.isPrimary) {
      await tx.userRoleBinding.updateMany({
        where: { userId: user.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // createMany + fetch avoids relying on compound-unique field names
    await tx.userRoleBinding.createMany({
      data: [
        {
          userId: user.id,
          branchId: assignment.branchId,
          roleVersionId,
          staffAssignmentId: assignment.id,
          isPrimary: assignment.isPrimary,
          isActive,
          effectiveFrom: assignment.effectiveFrom,
          effectiveTo: assignment.effectiveTo,
        },
      ],
      skipDuplicates: true,
    });

    return tx.userRoleBinding.findFirst({
      where: { userId: user.id, staffAssignmentId: assignment.id, roleVersionId },
    });
  }

  /**
   * Ensures:
   * - at most one primary StaffAssignment among non-ended assignments
   * - if none exists, pick one and mark it primary
   * - keep UserRoleBinding primary flags consistent
   * - update User.branchId (back-compat/default branch)
  */
  private async ensurePrimaryInvariant(tx: any, staffId: string, userId?: string | null) {
    const active: Array<{ id: string; branchId: string; isPrimary: boolean }> = await tx.staffAssignment.findMany({
      where: { staffId, status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] as any } },
      orderBy: [{ isPrimary: "desc" }, { effectiveFrom: "desc" }],
      select: { id: true, branchId: true, isPrimary: true },
      take: 50,
    });

    if (!active.length) {
      if (userId) {
        await tx.userRoleBinding.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
      }
      return null;
    }

    const chosen = active.find((a) => a.isPrimary) ?? active[0];

    // If none was primary, promote chosen
    if (!chosen.isPrimary) {
      await tx.staffAssignment.update({ where: { id: chosen.id }, data: { isPrimary: true } });
    }

    // Demote any other primaries
    const otherPrimaryIds = active.filter((a) => a.isPrimary && a.id !== chosen.id).map((a) => a.id);
    if (otherPrimaryIds.length) {
      await tx.staffAssignment.updateMany({ where: { id: { in: otherPrimaryIds } }, data: { isPrimary: false } });
    }

    if (userId) {
      await tx.userRoleBinding.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
      await tx.userRoleBinding.updateMany({ where: { userId, staffAssignmentId: chosen.id }, data: { isPrimary: true } });
      await tx.user.update({ where: { id: userId }, data: { branchId: chosen.branchId } });
    }

    return chosen;
  }

  // ---------------- Staff Directory ----------------
  async listStaff(
    principal: Principal,
    q: {
      q?: string;
      branchId?: string | null;
      status?: string | null;
      category?: string | null;
      engagementType?: string | null;
      departmentId?: string | null;
      designation?: string | null;
      onboarding?: string | null;
      credentialStatus?: string | null; // VALID | EXPIRED | NONE
      cursor?: string | null;
      take?: number;
    },
  ) {
    const take = q.take && Number.isFinite(q.take) ? Math.min(Math.max(q.take, 1), 200) : 50;
    const now = new Date();

    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.category) {
      const normalizedCategory = this.normalizeStaffCategory(q.category);
      if (!normalizedCategory) throw new BadRequestException("Invalid category");
      where.category = normalizedCategory;
    }
    if (q.engagementType) where.engagementType = q.engagementType;
        // ✅ Onboarding tab filter (Drafted vs Boarded)
    if (q.onboarding) {
      const ob = q.onboarding.trim().toUpperCase();
      if (ob === "DRAFT" || ob === "DRAFTED") {
        where.onboardingStatus = "DRAFT";
      } else if (ob === "BOARDED") {
        where.onboardingStatus = { in: ["IN_REVIEW", "ACTIVE"] };
      } else if (ob === "IN_REVIEW") {
        where.onboardingStatus = "IN_REVIEW";
      } else if (ob === "ACTIVE") {
        where.onboardingStatus = "ACTIVE";
      }
    }

    // Branch scoping / branch filter (assignment-driven)
    const assignmentsSome: any = { status: { in: ["ACTIVE", "PLANNED"] as any } };
    let useAssignments = false;

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      assignmentsSome.branchId = { in: allowed };
      useAssignments = true;
    } else if (q.branchId) {
      assignmentsSome.branchId = q.branchId;
      useAssignments = true;
    }

    if (q.departmentId) {
      assignmentsSome.departmentId = q.departmentId;
      useAssignments = true;
    }

    if (useAssignments) {
      where.assignments = { some: assignmentsSome };
    }

    if (q.designation) {
      const d = q.designation.trim();
      if (d) {
        where.AND = where.AND ?? [];
        where.AND.push({
          OR: [
            { designation: { contains: d, mode: "insensitive" } },
            { assignments: { some: { designation: { contains: d, mode: "insensitive" } } } },
          ],
        });
      }
    }

    if (q.credentialStatus) {
      const cs = q.credentialStatus.toUpperCase();
      if (cs === "VALID") {
        where.credentials = { some: { OR: [{ validTo: null }, { validTo: { gt: now } }] } };
      } else if (cs === "EXPIRED") {
        where.AND = where.AND ?? [];
        where.AND.push({ credentials: { some: { validTo: { lte: now } } } });
        where.AND.push({ credentials: { none: { OR: [{ validTo: null }, { validTo: { gt: now } }] } } });
      } else if (cs === "NONE") {
        where.credentials = { none: {} };
      }
    }

    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { empCode: { contains: q.q, mode: "insensitive" } },
        { phone: { contains: q.q } },
        { email: { contains: q.q, mode: "insensitive" } },
      ];
    }

    const findArgs: any = {
      where,
      orderBy: [{ id: "desc" }],
      take: take + 1,
      select: {
        id: true,
        empCode: true,
        name: true,
        designation: true,
        category: true,
        engagementType: true,
        status: true,
        phone: true,
        email: true,
        hprId: true,
        homeBranchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        onboardingStatus: true,
        onboardingCompletedAt: true,
        profilePhotoDocumentId: true,
        profilePhotoDocument: { select: { id: true, fileUrl: true } },
        user: { select: { id: true, email: true, isActive: true, source: true } },
        assignments: {
          where: { status: { in: ["ACTIVE", "PLANNED"] } },
          orderBy: [{ isPrimary: "desc" }, { effectiveFrom: "desc" }],
        },
      },
    };

    if (q.cursor) {
      findArgs.cursor = { id: q.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.staff.findMany(findArgs);

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async getStaffProfile(principal: Principal, staffId: string) {
    const row = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        user: { select: { id: true, email: true, role: true, roleVersionId: true, isActive: true, source: true, branchId: true } },
        assignments: { orderBy: [{ isPrimary: "desc" }, { effectiveFrom: "desc" }] },
        credentials: {
          orderBy: [{ validTo: "asc" }, { createdAt: "desc" }],
          include: {
            evidences: { include: { staffDocument: true } },
            verifiedByUser: { select: { id: true, email: true } },
          },
        },
        identifiers: { orderBy: [{ createdAt: "desc" }] },
        documents: { orderBy: [{ createdAt: "desc" }] },
        profilePhotoDocument: { select: { id: true, fileUrl: true, fileMime: true, fileSizeBytes: true } },
        signatureDocument: { select: { id: true, fileUrl: true } },
        stampDocument: { select: { id: true, fileUrl: true } },
        onboardingItems: { orderBy: [{ createdAt: "desc" }] },
        privilegeGrants: { orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] },
        providerProfiles: { orderBy: [{ updatedAt: "desc" }] },
        complianceAssignments: { orderBy: [{ createdAt: "desc" }] },
      },
    });
    if (!row) throw new NotFoundException("Staff not found");

    // Enforce branch scoping for non-global
    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const ok = row.assignments.some((a) => allowed.includes(a.branchId));
      if (!ok) throw new ForbiddenException("Forbidden");
    }

    // Profile completeness: include role bindings (multi-branch RBAC) for Staff-managed users
    const roleBindings = row.user?.id
      ? await this.ctx.prisma.userRoleBinding.findMany({
        where: { userId: row.user.id },
        include: {
          branch: { select: { id: true, code: true, name: true } },
          roleVersion: { include: { roleTemplate: true } },
          staffAssignment: { select: { id: true, branchId: true, isPrimary: true, status: true, effectiveFrom: true, effectiveTo: true } },
        },
        orderBy: [{ isPrimary: "desc" }, { branchId: "asc" }],
      })
      : [];

    const legacyStructuredInNotes = !(row as any).personalDetails && !!tryExtractStructuredFromNotes((row as any).notes ?? null);
    return { ...row, roleBindings, legacyStructuredInNotes } as any;
  }


  async updateStaff(principal: Principal, staffId: string, dto: UpdateStaffDto) {
    const existing = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true, identifiers: true },
    });
    if (!existing) throw new NotFoundException("Staff not found");

    // Enforce branch scoping for non-global
    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const ok = existing.assignments.some((a) => allowed.includes(a.branchId));
      if (!ok) throw new ForbiddenException("Forbidden");
    }

    const existingPersonal = safeJsonObject((existing as any).personalDetails) ?? {};
    const existingContact = safeJsonObject((existing as any).contactDetails) ?? {};
    const existingEmployment = safeJsonObject((existing as any).employmentDetails) ?? {};
    const existingMedical = safeJsonObject((existing as any).medicalDetails) ?? {};
    const existingSystem = safeJsonObject((existing as any).systemAccess) ?? {};

    // If caller is still sending legacy structured JSON in notes, auto-extract it.
    const legacyFromNotes = dto.notes !== undefined ? tryExtractStructuredFromNotes(dto.notes ?? null) : null;

    // Unified payload (preferred)
    const pd = (dto.personal_details as any) ?? (legacyFromNotes?.personal_details as any) ?? null;
    const cd = (dto.contact_details as any) ?? (legacyFromNotes?.contact_details as any) ?? null;
    const ed = (dto.employment_details as any) ?? (legacyFromNotes?.employment_details as any) ?? null;
    const md = (dto.medical_details as any) ?? (legacyFromNotes?.medical_details as any) ?? null;
    const sa = (dto.system_access as any) ?? (legacyFromNotes?.system_access as any) ?? null;

    const wantsUnified = !!(pd || cd || ed || md || sa);

    // Contact normalization: allow either flat email/phone or unified contact_details
    const nextEmailRaw =
      cd?.email_official !== undefined
        ? cd?.email_official
        : dto.email === undefined
          ? (existing.email ?? null)
          : dto.email;

    const nextPhoneRaw =
      cd?.mobile_primary !== undefined
        ? cd?.mobile_primary
        : dto.phone === undefined
          ? (existing.phone ?? null)
          : dto.phone;

    const nextEmail = nextEmailRaw ? String(nextEmailRaw).trim().toLowerCase() : null;
    const nextPhone = nextPhoneRaw ? String(nextPhoneRaw).trim() : null;

    // DPDP-safe minimal collection: require at least one contact method.
    const effectiveOnboarding =
      dto.onboardingStatus ?? (existing as any).onboardingStatus ?? "ACTIVE";

    const allowMissingContact = effectiveOnboarding === "DRAFT";

    if (!allowMissingContact && !nextEmail && !nextPhone) {
      throw new BadRequestException("Either email or phone is required");
    }


    const data: any = {
      // legacy flat fields are still supported
      name: dto.name ? dto.name.trim() : undefined,
      designation:
        dto.designation === undefined
          ? undefined
          : dto.designation
            ? dto.designation.trim()
            : "STAFF",
      category: this.normalizeStaffCategory(dto.category) ?? undefined,
      engagementType: (dto.engagementType as any) ?? undefined,
      email: dto.email === undefined && cd?.email_official === undefined ? undefined : nextEmail,
      phone: dto.phone === undefined && cd?.mobile_primary === undefined ? undefined : nextPhone,
      hprId: dto.hprId === undefined ? undefined : dto.hprId ? dto.hprId.trim() : null,
      homeBranchId: dto.homeBranchId === undefined ? undefined : dto.homeBranchId,
      notes: dto.notes === undefined ? undefined : dto.notes,

      onboardingStatus: dto.onboardingStatus === undefined ? undefined : (dto.onboardingStatus as any),
      profilePhotoDocumentId: dto.profilePhotoDocumentId === undefined ? undefined : dto.profilePhotoDocumentId,
      signatureDocumentId: dto.signatureDocumentId === undefined ? undefined : dto.signatureDocumentId,
      stampDocumentId: dto.stampDocumentId === undefined ? undefined : dto.stampDocumentId,
    };

    // Direct JSON patches (advanced/internal)
    if (dto.personalDetails !== undefined) data.personalDetails = dto.personalDetails ? stripSensitiveFromJson(dto.personalDetails) : null;
    if (dto.contactDetails !== undefined) data.contactDetails = dto.contactDetails ? stripSensitiveFromJson(dto.contactDetails) : null;
    if (dto.employmentDetails !== undefined) data.employmentDetails = dto.employmentDetails ? stripSensitiveFromJson(dto.employmentDetails) : null;
    if (dto.medicalDetails !== undefined) data.medicalDetails = dto.medicalDetails ? stripSensitiveFromJson(dto.medicalDetails) : null;
    if (dto.systemAccess !== undefined) data.systemAccess = dto.systemAccess ? stripSensitiveFromJson(dto.systemAccess) : null;

    // Unified payload -> JSON columns (preferred)
    if (wantsUnified) {
      const firstName = pd?.first_name ?? existingPersonal.first_name ?? null;
      const lastName = pd?.last_name ?? existingPersonal.last_name ?? null;
      const derivedName =
        firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : (dto.name ?? existing.name);

      data.name = derivedName?.trim() ?? existing.name;
      data.email = nextEmail;
      data.phone = nextPhone;

      // Derive category/engagement/designation from employment_details if provided
      if (ed?.staff_category) {
        const sc = String(ed.staff_category).toUpperCase();
        const isMedical = sc === "DOCTOR" || sc === "NURSE" || sc === "PARAMEDIC";
        data.category = isMedical ? "CLINICAL" : "NON_CLINICAL";
      }
      if (ed?.designation !== undefined) data.designation = ed.designation ? String(ed.designation).trim() : "STAFF";

      // Merge into JSON columns, stripping sensitive keys
      const nextPD = {
        ...existingPersonal,
        ...(pd ? stripSensitiveFromJson(pd) : {}),
        // keep dob/gender if passed
      };
      const nextCD = {
        ...existingContact,
        ...(cd ? stripSensitiveFromJson(cd) : {}),
        // always mirror canonical email/phone into the JSON block for UI consistency
        email_official: nextEmail,
        mobile_primary: nextPhone,
      };
      const nextED = {
        ...existingEmployment,
        ...(ed ? stripSensitiveFromJson(ed) : {}),
      };
      const nextMD = {
        ...existingMedical,
        ...(md ? stripSensitiveFromJson(md) : {}),
      };
      const nextSA = {
        ...existingSystem,
        ...(sa ? stripSensitiveFromJson(sa) : {}),
      };

      data.personalDetails = nextPD;
      data.contactDetails = nextCD;
      data.employmentDetails = nextED;
      data.medicalDetails = nextMD;
      data.systemAccess = nextSA;
    }

    const before = {
      name: existing.name,
      designation: existing.designation,
      category: existing.category,
      engagementType: existing.engagementType,
      email: existing.email,
      phone: existing.phone,
      hprId: existing.hprId,
      homeBranchId: existing.homeBranchId,
      notes: (existing as any).notes ?? null,
      onboardingStatus: (existing as any).onboardingStatus ?? null,
      profilePhotoDocumentId: (existing as any).profilePhotoDocumentId ?? null,
      signatureDocumentId: (existing as any).signatureDocumentId ?? null,
      stampDocumentId: (existing as any).stampDocumentId ?? null,
    };

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      // Validate document pointers belong to this staff
      const pointerIds = [
        data.profilePhotoDocumentId ?? null,
        data.signatureDocumentId ?? null,
        data.stampDocumentId ?? null,
      ].filter(Boolean) as string[];
      if (pointerIds.length) {
        const docs = await tx.staffDocument.findMany({
          where: { id: { in: pointerIds }, staffId },
          select: { id: true },
        });
        if (docs.length !== pointerIds.length) throw new BadRequestException("Invalid document pointer (must belong to staff)");
      }

      // If national_id provided in unified payload, upsert DPDP-safe identifier record
      const rawNat = pd?.national_id ?? null;
      if (rawNat) {
        const natType = guessNationalIdType(String(rawNat));
        const norm = normalizeIdentifierValue(natType, String(rawNat));
        const valueHash = hashIdentifier(natType, norm);
        const existingId = await tx.staffIdentifier.findFirst({ where: { type: natType as any, valueHash }, select: { id: true, staffId: true } });
        if (existingId && existingId.staffId !== staffId) throw new ConflictException("Identifier is already used by another staff");
        if (!existingId) {
          await tx.staffIdentifier.create({
            data: {
              staffId,
              type: natType as any,
              valueHash,
              valueLast4: last4(norm),
            } as any,
          });
        }
      }

      const s = await tx.staff.update({ where: { id: staffId }, data });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_UPDATE",
          entity: "Staff",
          entityId: staffId,
          meta: { before, after: { ...before, ...data }, unified: wantsUnified, legacyFromNotes: !!legacyFromNotes },
        },
        tx,
      );

      return s;
    });

    return { ok: true, staff: updated };
  }

  async migrateNotesToProfile(principal: Principal, staffId: string) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const ok = staff.assignments.some((a) => allowed.includes(a.branchId));
      if (!ok) throw new ForbiddenException("Forbidden");
    }

    const structured = tryExtractStructuredFromNotes((staff as any).notes ?? null);
    if (!structured) {
      return { ok: false, message: "No structured JSON found in notes" };
    }

    const notesTrim = String((staff as any).notes ?? "").trim();
    const shouldClearNotes = notesTrim.startsWith("{") && notesTrim.endsWith("}");
    const dto: any = {
      personal_details: structured.personal_details ?? undefined,
      contact_details: structured.contact_details ?? undefined,
      employment_details: structured.employment_details ?? undefined,
      medical_details: structured.medical_details ?? undefined,
      system_access: structured.system_access ?? undefined,
      notes: shouldClearNotes ? null : (staff as any).notes,
    };

    return this.updateStaff(principal, staffId, dto);
  }


  // ---------------- Dedupe (preview) ----------------

  async dedupePreview(_principal: Principal, dto: StaffOnboardDto) {
    const empCode = canonicalizeCode(dto.empCode);
    const email = dto.email?.trim().toLowerCase() ?? null;
    const phone = dto.phone?.trim() ?? null;
    const hprId = dto.hprId?.trim() ?? null;

    if (!email && !phone) throw new BadRequestException("Either email or phone is required");

    const idInputs = Array.isArray(dto.identifiers) ? dto.identifiers : [];
    const idQueries = idInputs
      .map((i) => {
        const type = String(i.type ?? "").trim();
        const norm = normalizeIdentifierValue(type, (i as any).value);
        if (!type || !norm) return null;
        return {
          type,
          valueHash: hashIdentifier(type, norm),
          valueLast4: last4(norm),
        };
      })
      .filter(Boolean) as { type: string; valueHash: string; valueLast4: string | null }[];

    const directMatches = await this.ctx.prisma.staff.findMany({
      where: {
        OR: [
          { empCode },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
          ...(hprId ? [{ hprId }] : []),
        ],
      },
      take: 20,
      select: { id: true, empCode: true, name: true, phone: true, email: true, hprId: true, status: true, isActive: true },
    });

    const identHits = idQueries.length
      ? await this.ctx.prisma.staffIdentifier.findMany({
        where: {
          OR: idQueries.map((q) => ({ type: q.type as any, valueHash: q.valueHash })),
        },
        include: {
          staff: {
            select: {
              id: true,
              empCode: true,
              name: true,
              phone: true,
              email: true,
              hprId: true,
              status: true,
              isActive: true,
            },
          },
        },
        take: 20,
      })
      : [];

    const byId = new Map<string, any>();
    for (const m of directMatches) byId.set(m.id, { ...m, matchSource: "DIRECT" });
    for (const hit of identHits) {
      if (!hit.staff) continue;
      const prev = byId.get(hit.staff.id);
      byId.set(hit.staff.id, {
        ...(prev ?? hit.staff),
        matchSource: prev ? "DIRECT+IDENTIFIER" : "IDENTIFIER",
      });
    }

    const matches = Array.from(byId.values());

    return {
      matches,
      identifierHits: identHits.map((h) => ({
        staffId: h.staffId,
        type: h.type,
        valueLast4: h.valueLast4,
      })),
    };
  }
  async createStaffMaster(principal: Principal, dto: StaffCreateMasterDto) {
    const empCode = canonicalizeCode(dto.employee_id);

    const pd = dto.personal_details;
    const cd = dto.contact_details;
    const ed = dto.employment_details;

    const firstName = String(pd.first_name ?? "").trim();
    const lastName = String(pd.last_name ?? "").trim();
    const displayName = `${firstName} ${lastName}`.trim();

    const email = String(cd.email_official ?? "").trim().toLowerCase();
    const phone = String(cd.mobile_primary ?? "").trim();

    const staffCat = String(ed.staff_category ?? "").toUpperCase();
    const isMedical = staffCat === "DOCTOR" || staffCat === "NURSE" || staffCat === "PARAMEDIC";

    const empStatus = (ed.employment_status ?? "PERMANENT").toUpperCase();
    const engagementType = empStatus === "VISITING" ? "VISITING" : empStatus === "CONTRACT" ? "CONTRACTOR" : "EMPLOYEE";

    // DPDP-safe identifier: store ONLY hash + last4 (raw is never stored)
    const natType = guessNationalIdType(pd.national_id);
    const natNorm = normalizeIdentifierValue(natType, pd.national_id);
    if (!natNorm) throw new BadRequestException("personal_details.national_id is required");
    const natHash = hashIdentifier(natType, natNorm);
    const natLast4 = last4(natNorm);

    // Dedupe checks (empCode + contact + national identifier)
    const possible = await this.ctx.prisma.staff.findMany({
      where: {
        OR: [{ empCode }, ...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
      take: 20,
      select: { id: true, empCode: true, name: true, phone: true, email: true, status: true },
    });

    const identHit = await this.ctx.prisma.staffIdentifier.findFirst({
      where: { type: natType as any, valueHash: natHash },
      select: { staffId: true, type: true, valueLast4: true },
    });

    if ((possible.length || identHit) && !dto.force_create) {
      const matchesById = new Map<string, any>();
      for (const m of possible) matchesById.set(m.id, m);

      if (identHit) {
        const s = await this.ctx.prisma.staff.findUnique({
          where: { id: identHit.staffId },
          select: { id: true, empCode: true, name: true, phone: true, email: true, status: true },
        });
        if (s) matchesById.set(s.id, s);
      }

      throw new ConflictException({
        message: "Possible duplicate staff found",
        matches: Array.from(matchesById.values()),
        identifierHit: identHit ? { type: identHit.type, valueLast4: identHit.valueLast4, staffId: identHit.staffId } : null,
      });
    }

    // Safe JSON snapshots (no raw national_id stored)
    const personalDetails = {
      first_name: firstName,
      last_name: lastName,
      dob: pd.dob,
      gender: pd.gender,
      national_id_type: natType,
      national_id_last4: natLast4,
    };

    const contactDetails = {
      mobile_primary: phone,
      email_official: email,
      current_address: cd.current_address,
      emergency_contact: cd.emergency_contact ?? null,
    };

    const employmentDetails = {
      staff_category: ed.staff_category,
      department: ed.department,
      designation: ed.designation ?? null,
      date_of_joining: ed.date_of_joining,
      employment_status: empStatus,
    };

    // Optional medical details snapshot (license_number is NOT stored here as plaintext; it lives in StaffCredential)
    const md = dto.medical_details;
    const medicalDetails = isMedical
      ? {
        issuing_council: md?.issuing_council ?? null,
        specialization: md?.specialization ?? null,
        qualification: md?.qualification ?? null,
        clinical_privileges: md?.clinical_privileges ?? [],
        license_last4: md?.license_number ? last4(normalizeIdentifierValue("OTHER", md.license_number)) : null,
      }
      : null;

    const systemAccess = dto.system_access ?? null;

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          empCode,
          name: displayName,
          designation: (ed.designation ?? ed.staff_category ?? "STAFF").toString().trim(),
          category: isMedical ? "CLINICAL" : "NON_CLINICAL",
          engagementType: engagementType as any,
          email,
          phone,
          status: "ACTIVE" as any,
          isActive: true,
          personalDetails: personalDetails as any,
          contactDetails: contactDetails as any,
          employmentDetails: employmentDetails as any,
          medicalDetails: medicalDetails as any,
          systemAccess: systemAccess as any,
        } as any,
      });

      // National Id (DPDP-safe: hash + last4)
      await tx.staffIdentifier.create({
        data: {
          staffId: staff.id,
          type: natType as any,
          valueHash: natHash,
          valueLast4: natLast4,
        },
      });

      // Optional initial credential for medical staff
      let credential: any = null;
      if (isMedical && dto.medical_details) {
        const credType = staffCat === "DOCTOR" ? "MEDICAL_REG" : staffCat === "NURSE" ? "NURSING_REG" : "TECH_CERT";
        credential = await tx.staffCredential.create({
          data: {
            staffId: staff.id,
            type: credType as any,
            authority: dto.medical_details.issuing_council,
            registrationNumber: dto.medical_details.license_number,
            verificationStatus: "UNVERIFIED" as any,
          },
        });
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_MASTER_CREATE",
          entity: "Staff",
          entityId: staff.id,
          meta: {
            empCode,
            name: displayName,
            category: isMedical ? "MEDICAL" : "NON_MEDICAL",
            employment: employmentDetails,
            nationalId: { type: natType, valueLast4: natLast4 },
            createdCredentialType: credential?.type ?? null,
          },
        },
        tx,
      );

      return { staff, credential };
    });

    // system_access provisioning is intentionally deferred to existing endpoints
    // because branch-scoped role bindings depend on assignments.
    return {
      ok: true,
      staff: created.staff,
      createdCredential: created.credential,
      next: {
        addAssignment: "POST /infrastructure/staff/:staffId/assignments",
        provisionUser: "POST /infrastructure/staff/:staffId/provision-user",
      },
    };
  }
  async createStaffDraft(principal: Principal) {
    const tempCode = `DRAFT-${Date.now().toString().slice(-8)}-${Math.random()
      .toString(16)
      .slice(2, 6)
      .toUpperCase()}`.slice(0, 32);

    const staff = await this.ctx.prisma.staff.create({
      data: {
        empCode: tempCode,
        name: "Draft Staff",
        designation: "STAFF",
        category: "NON_CLINICAL",
        engagementType: "EMPLOYEE",
        status: "ACTIVE",
        onboardingStatus: "DRAFT",
        isActive: true,
        personalDetails: {},
        contactDetails: {},
        employmentDetails: {},
        medicalDetails: {},
        systemAccess: {},
      } as any,
    });

    return { ok: true, staffId: staff.id };
  }

  // ---------------- Onboarding (Staff master + required assignments) ----------------

  async onboardStaff(principal: Principal, dto: StaffOnboardDto) {
    const empCode = canonicalizeCode(dto.empCode);

    // Prepare DPDP-safe identifiers (hash + last4). Raw values are never stored.
    const identifierInputs = Array.isArray(dto.identifiers) ? dto.identifiers : [];
    const identifiersPrepared = identifierInputs
      .map((i) => {
        const type = String(i.type ?? "").trim();
        const norm = normalizeIdentifierValue(type, (i as any).value);
        if (!type || !norm) return null;
        return {
          type,
          valueHash: hashIdentifier(type, norm),
          valueLast4: last4(norm),
          issuedBy: (i.issuedBy ?? null) ? String(i.issuedBy).trim() : null,
          issuedAt: parseDate((i as any).issuedAt ?? null),
        };
      })
      .filter(Boolean) as { type: string; valueHash: string; valueLast4: string | null; issuedBy: string | null; issuedAt: Date | null }[];

    // Validate assignment branches
    for (const a of dto.assignments) this.assertCanOperateOnBranch(principal, a.branchId);

    // Enforce: at most one primary assignment in the incoming payload
    // NOTE: when adding assignments to an existing staff record, we do NOT auto-promote a new assignment to primary
    // unless the staff has no existing assignments at all (handled in that branch below).
    const incomingPrimaryCount = dto.assignments.filter((a) => a.isPrimary).length;
    if (incomingPrimaryCount > 1) throw new BadRequestException("Only one assignment can be primary");
    if (!dto.existingStaffId && incomingPrimaryCount === 0) dto.assignments[0].isPrimary = true;

    // Prevent overlapping assignments per branch (Phase-1 safe)
    const byBranch = new Map<string, { from: Date; to: Date | null }[]>();
    for (const a of dto.assignments) {
      const from = parseDate(a.effectiveFrom) ?? new Date();
      const to = parseDate(a.effectiveTo ?? null);
      const list = byBranch.get(a.branchId) ?? [];
      list.push({ from, to });
      byBranch.set(a.branchId, list);
    }
    for (const [branchId, ranges] of byBranch.entries()) {
      for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
          if (overlaps(ranges[i].from, ranges[i].to, ranges[j].from, ranges[j].to)) {
            throw new BadRequestException(`Overlapping assignments detected for branch ${branchId}`);
          }
        }
      }
    }

    // If adding assignments to existing staff
    if (dto.existingStaffId) {
      const existing = await this.ctx.prisma.staff.findUnique({
        where: { id: dto.existingStaffId },
        include: { assignments: true, user: true },
      });
      if (!existing) throw new NotFoundException("existingStaffId not found");

      // If the existing staff has no assignments at all, and caller didn't specify a primary,
      // auto-primary the first new assignment.
      if (incomingPrimaryCount === 0 && (existing.assignments?.length ?? 0) === 0) {
        dto.assignments[0].isPrimary = true;
      }

      // Branch scope check must match at least one assignment branch
      if (principal.roleScope !== "GLOBAL") {
        const allowed = this.allowedBranchIds(principal);
        const ok = dto.assignments.every((a) => allowed.includes(a.branchId));
        if (!ok) throw new ForbiddenException("Forbidden");
      }

      const created = await this.ctx.prisma.$transaction(async (tx) => {
        const hasNewPrimary = dto.assignments.some((a) => a.isPrimary);

        // Keep single-primary invariant across the whole staff timeline
        if (hasNewPrimary) {
          await tx.staffAssignment.updateMany({
            where: { staffId: existing.id, isPrimary: true },
            data: { isPrimary: false },
          });
          if (existing.user?.id) {
            await tx.userRoleBinding.updateMany({
              where: { userId: existing.user.id, isPrimary: true },
              data: { isPrimary: false },
            });
          }
        }

        const createdAssignments: any[] = [];
        for (const a of dto.assignments) {
          const { from, to } = this.normalizeDateRange(a.effectiveFrom ?? null, a.effectiveTo ?? null, true);
          await this.validateNoOverlapAgainstDb(tx, existing.id, a.branchId, from, to);

          const assignment = await tx.staffAssignment.create({
            data: {
              staffId: existing.id,
              branchId: a.branchId,
              facilityId: a.facilityId ?? null,
              departmentId: a.departmentId ?? null,
              specialtyId: a.specialtyId ?? null,
              unitId: a.unitId ?? null,
              branchEmpCode: a.branchEmpCode ?? null,
              designation: a.designation ?? null,
              assignmentType: (a.assignmentType as any) ?? undefined,
              status: (a.status as any) ?? undefined,
              effectiveFrom: from,
              effectiveTo: to,
              isPrimary: !!a.isPrimary,
            },
          });
          createdAssignments.push(assignment);

          // Ensure access binding is created for staff-managed users
          if (existing.user?.id) {
            await this.upsertRoleBindingForAssignment(tx, existing.user as any, {
              id: assignment.id,
              branchId: assignment.branchId,
              isPrimary: assignment.isPrimary,
              status: assignment.status,
              effectiveFrom: assignment.effectiveFrom,
              effectiveTo: assignment.effectiveTo,
            });
          }
        }

        // Optional: add identifiers to existing staff (DPDP-safe)
        if (identifiersPrepared.length) {
          const hits = await tx.staffIdentifier.findMany({
            where: {
              OR: identifiersPrepared.map((i) => ({ type: i.type as any, valueHash: i.valueHash })),
            },
            select: { id: true, staffId: true, type: true, valueLast4: true },
            take: 50,
          });

          const conflict = hits.find((h) => h.staffId !== existing.id);
          if (conflict) {
            throw new ConflictException({
              message: "Identifier already linked to a different staff",
              identifier: { type: conflict.type, valueLast4: conflict.valueLast4 },
              existingStaffId: conflict.staffId,
            });
          }

          // Create only missing identifiers for this staff
          for (const i of identifiersPrepared) {
            // hits doesn't include valueHash; check by query for this staff
            const already = await tx.staffIdentifier.findFirst({
              where: { staffId: existing.id, type: i.type as any, valueHash: i.valueHash },
              select: { id: true },
            });
            if (already) continue;
            await tx.staffIdentifier.create({
              data: {
                staffId: existing.id,
                type: i.type as any,
                valueHash: i.valueHash,
                valueLast4: i.valueLast4,
                issuedBy: i.issuedBy,
                issuedAt: i.issuedAt,
              },
            });
          }
        }

        // Keep primary flags and user.branchId consistent
        if (existing.user?.id) {
          await this.ensurePrimaryInvariant(tx, existing.id, existing.user.id);
          await this.bumpAuthz(existing.user.id, tx);
        }

        await this.ctx.audit.log(
          {
            branchId: null,
            actorUserId: principal.userId,
            action: "STAFF_ASSIGNMENTS_ADD",
            entity: "Staff",
            entityId: existing.id,
            meta: { assignments: dto.assignments, identifiersAdded: identifiersPrepared.map((i) => ({ type: i.type, valueLast4: i.valueLast4 })) },
          },
          tx,
        );

        return { staffId: existing.id, createdAssignments };
      });

      return { ok: true, mode: "EXISTING", ...created };
    }

    // Dedupe detection (Conflict unless forceCreate)
    const email = dto.email?.trim().toLowerCase() ?? null;
    const phone = dto.phone?.trim() ?? null;
    const hprId = dto.hprId?.trim() ?? null;

    if (!email && !phone) throw new BadRequestException("Either email or phone is required");

    const possible = await this.ctx.prisma.staff.findMany({
      where: {
        OR: [
          { empCode },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
          ...(hprId ? [{ hprId }] : []),
        ],
      },
      take: 20,
      select: { id: true, empCode: true, name: true, phone: true, email: true, hprId: true, status: true },
    });

    const identifierHits = identifiersPrepared.length
      ? await this.ctx.prisma.staffIdentifier.findMany({
        where: { OR: identifiersPrepared.map((i) => ({ type: i.type as any, valueHash: i.valueHash })) },
        select: { staffId: true, type: true, valueLast4: true },
        take: 20,
      })
      : [];

    if (identifierHits.length) {
      const staffIds = uniq(identifierHits.map((x) => x.staffId));
      const byId = new Map<string, any>(possible.map((s) => [s.id, s]));
      if (staffIds.length) {
        const staffRows = await this.ctx.prisma.staff.findMany({
          where: { id: { in: staffIds } },
          take: 20,
          select: { id: true, empCode: true, name: true, phone: true, email: true, hprId: true, status: true },
        });
        for (const s of staffRows) byId.set(s.id, s);
      }

      // Identifiers are unique across staff — creating a new staff with an already-used identifier is NOT allowed.
      throw new ConflictException({
        message: "Identifier already linked to an existing staff",
        matches: Array.from(byId.values()),
        identifierHits,
      });
    }

    if (possible.length && !dto.forceCreate) {
      throw new ConflictException({ message: "Possible duplicate staff found", matches: possible });
    }

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          empCode,
          name: dto.name.trim(),
          designation: dto.designation?.trim() || "STAFF",
          category: this.normalizeStaffCategory(dto.category) ?? undefined,
          engagementType: (dto.engagementType as any) ?? undefined,
          email,
          phone,
          hprId,
          status: "ACTIVE" as any,
          isActive: true,
        },
      });

      const assignments = await Promise.all(
        dto.assignments.map((a) =>
          tx.staffAssignment.create({
            data: {
              staffId: staff.id,
              branchId: a.branchId,
              facilityId: a.facilityId ?? null,
              departmentId: a.departmentId ?? null,
              specialtyId: a.specialtyId ?? null,
              unitId: a.unitId ?? null,
              branchEmpCode: a.branchEmpCode ?? null,
              designation: a.designation ?? null,
              assignmentType: (a.assignmentType as any) ?? undefined,
              status: (a.status as any) ?? undefined,
              effectiveFrom: parseDate(a.effectiveFrom) ?? new Date(),
              effectiveTo: parseDate(a.effectiveTo ?? null),
              isPrimary: !!a.isPrimary,
            },
          }),
        ),
      );

      // Create DPDP-safe identifiers (hash + last4). Raw values are never stored.
      if (identifiersPrepared.length) {
        for (const i of identifiersPrepared) {
          try {
            await tx.staffIdentifier.create({
              data: {
                staffId: staff.id,
                type: i.type as any,
                valueHash: i.valueHash,
                valueLast4: i.valueLast4,
                issuedBy: i.issuedBy,
                issuedAt: i.issuedAt,
              },
            });
          } catch (e: any) {
            if (String(e?.code) === "P2002") {
              throw new ConflictException("Identifier already exists (duplicate)");
            }
            throw e;
          }
        }
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_ONBOARD",
          entity: "Staff",
          entityId: staff.id,
          meta: {
            staff: { empCode, name: dto.name, category: dto.category },
            assignments: dto.assignments,
            identifiers: identifiersPrepared.map((i) => ({ type: i.type, valueLast4: i.valueLast4 })),
          },
        },
        tx,
      );

      return { staff, assignments };
    });

    return { ok: true, mode: "NEW", ...created };
  }

  // ---------------- Assignments lifecycle (Controller expects these) ----------------

  async createAssignment(principal: Principal, staffId: string, dto: StaffAssignmentInputDto) {
    this.assertCanOperateOnBranch(principal, dto.branchId);

    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        assignments: { select: { id: true, branchId: true, isPrimary: true, status: true } },
        user: { select: { id: true, role: true, roleVersionId: true } },
      },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    // Non-global users can only operate on staff they can see (search/list already scopes),
    // but we still enforce: at least one staff assignment is within allowed branches OR target branch is allowed (already checked above).
    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const visible = staff.assignments.some((a) => allowed.includes(a.branchId)) || allowed.includes(dto.branchId);
      if (!visible) throw new ForbiddenException("Forbidden");
    }

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      // If there are no non-ended assignments, default this as primary unless caller explicitly sets false
      const hasAnyNonEnded = await tx.staffAssignment.findFirst({
        where: { staffId, status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] as any } },
        select: { id: true },
      });

      const shouldBePrimary = dto.isPrimary === true || !hasAnyNonEnded;

      if (shouldBePrimary) {
        await tx.staffAssignment.updateMany({ where: { staffId, isPrimary: true }, data: { isPrimary: false } });
        if (staff.user?.id) {
          await tx.userRoleBinding.updateMany({ where: { userId: staff.user.id, isPrimary: true }, data: { isPrimary: false } });
        }
      }

      const { from, to } = this.normalizeDateRange(dto.effectiveFrom ?? null, dto.effectiveTo ?? null, true);
      await this.validateNoOverlapAgainstDb(tx, staffId, dto.branchId, from, to);

      const assignment = await tx.staffAssignment.create({
        data: {
          staffId,
          branchId: dto.branchId,
          facilityId: dto.facilityId ?? null,
          departmentId: dto.departmentId ?? null,
          specialtyId: dto.specialtyId ?? null,
          unitId: dto.unitId ?? null,
          branchEmpCode: dto.branchEmpCode ?? null,
          designation: dto.designation ?? null,
          assignmentType: (dto.assignmentType as any) ?? undefined,
          status: (dto.status as any) ?? undefined,
          effectiveFrom: from,
          effectiveTo: to,
          isPrimary: shouldBePrimary,
        },
      });

      let binding: any = null;
      if (staff.user?.id) {
        binding = await this.upsertRoleBindingForAssignment(tx, staff.user as any, {
          id: assignment.id,
          branchId: assignment.branchId,
          isPrimary: assignment.isPrimary,
          status: assignment.status,
          effectiveFrom: assignment.effectiveFrom,
          effectiveTo: assignment.effectiveTo,
        });

        await this.ensurePrimaryInvariant(tx, staffId, staff.user.id);
        await this.bumpAuthz(staff.user.id, tx);
      } else {
        await this.ensurePrimaryInvariant(tx, staffId, null);
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_ASSIGNMENT_CREATE",
          entity: "StaffAssignment",
          entityId: assignment.id,
          meta: { staffId, ...dto },
        },
        tx,
      );

      return { assignment, binding };
    });

    return { ok: true, ...created };
  }

  async updateAssignment(principal: Principal, assignmentId: string, dto: UpdateStaffAssignmentDto) {
    const existing = await this.ctx.prisma.staffAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staff: { include: { user: { select: { id: true, role: true, roleVersionId: true } } } },
      },
    });
    if (!existing) throw new NotFoundException("Assignment not found");

    // Branch cannot change via update; enforce same-branch access
    this.assertCanOperateOnBranch(principal, existing.branchId);

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      // Primary change handling
      const wantsPrimary = dto.isPrimary === true;

      if (wantsPrimary) {
        await tx.staffAssignment.updateMany({ where: { staffId: existing.staffId, isPrimary: true }, data: { isPrimary: false } });
        if (existing.staff.user?.id) {
          await tx.userRoleBinding.updateMany({ where: { userId: existing.staff.user.id, isPrimary: true }, data: { isPrimary: false } });
        }
      }

      const nextFrom =
        dto.effectiveFrom !== undefined
          ? (() => {
            const d = parseDate(dto.effectiveFrom);
            if (!d) throw new BadRequestException("Invalid date for effectiveFrom");
            return d;
          })()
          : new Date(existing.effectiveFrom);

      const nextTo =
        dto.effectiveTo !== undefined ? parseDate(dto.effectiveTo ?? null) : existing.effectiveTo ? new Date(existing.effectiveTo) : null;

      if (nextTo && nextTo.getTime() < nextFrom.getTime()) {
        throw new BadRequestException("effectiveTo must be >= effectiveFrom");
      }

      await this.validateNoOverlapAgainstDb(tx, existing.staffId, existing.branchId, nextFrom, nextTo, existing.id);

      const nextStatus = dto.status !== undefined ? (dto.status as any) : existing.status;

      const assignment = await tx.staffAssignment.update({
        where: { id: assignmentId },
        data: {
          facilityId: dto.facilityId !== undefined ? dto.facilityId : undefined,
          departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
          specialtyId: dto.specialtyId !== undefined ? dto.specialtyId : undefined,
          unitId: dto.unitId !== undefined ? dto.unitId : undefined,
          branchEmpCode: dto.branchEmpCode !== undefined ? dto.branchEmpCode : undefined,
          designation: dto.designation !== undefined ? dto.designation : undefined,
          assignmentType: dto.assignmentType !== undefined ? (dto.assignmentType as any) : undefined,
          status: dto.status !== undefined ? (dto.status as any) : undefined,
          effectiveFrom: dto.effectiveFrom !== undefined ? nextFrom : undefined,
          effectiveTo: dto.effectiveTo !== undefined ? nextTo : undefined,
          isPrimary: dto.isPrimary !== undefined ? !!dto.isPrimary : undefined,
        },
      });

      // Update role bindings for this assignment (if linked user exists)
      if (existing.staff.user?.id) {
        const isActive = this.bindingActiveForAssignmentStatus(nextStatus);

        const res = await tx.userRoleBinding.updateMany({
          where: { userId: existing.staff.user.id, staffAssignmentId: assignment.id },
          data: {
            isPrimary: assignment.isPrimary,
            isActive,
            effectiveFrom: nextFrom,
            effectiveTo: nextTo,
          },
        });

        // If binding was missing, create it
        if (res.count === 0) {
          await this.upsertRoleBindingForAssignment(tx, existing.staff.user as any, {
            id: assignment.id,
            branchId: assignment.branchId,
            isPrimary: assignment.isPrimary,
            status: assignment.status,
            effectiveFrom: assignment.effectiveFrom,
            effectiveTo: assignment.effectiveTo,
          });
        }

        await this.ensurePrimaryInvariant(tx, existing.staffId, existing.staff.user.id);
        await this.bumpAuthz(existing.staff.user.id, tx);
      } else {
        await this.ensurePrimaryInvariant(tx, existing.staffId, null);
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_ASSIGNMENT_UPDATE",
          entity: "StaffAssignment",
          entityId: assignment.id,
          meta: { staffId: existing.staffId, ...dto },
        },
        tx,
      );

      return assignment;
    });

    return { ok: true, assignment: updated };
  }

  async endAssignment(principal: Principal, assignmentId: string, dto: EndStaffAssignmentDto) {
    const existing = await this.ctx.prisma.staffAssignment.findUnique({
      where: { id: assignmentId },
      include: { staff: { include: { user: { select: { id: true, role: true, roleVersionId: true } } } } },
    });
    if (!existing) throw new NotFoundException("Assignment not found");

    this.assertCanOperateOnBranch(principal, existing.branchId);

    const endedAt = parseDate(dto.endedAt ?? null) ?? new Date();
    if (endedAt.getTime() < new Date(existing.effectiveFrom).getTime()) {
      throw new BadRequestException("endedAt must be >= effectiveFrom");
    }

    const result = await this.ctx.prisma.$transaction(async (tx) => {
      const assignment = await tx.staffAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "ENDED" as any,
          effectiveTo: endedAt,
          isPrimary: false,
        },
      });

      if (existing.staff.user?.id) {
        await tx.userRoleBinding.updateMany({
          where: { userId: existing.staff.user.id, staffAssignmentId: assignment.id },
          data: { isActive: false, effectiveTo: endedAt, isPrimary: false },
        });

        // Promote another primary if needed and keep user.branchId correct
        await this.ensurePrimaryInvariant(tx, existing.staffId, existing.staff.user.id);
        await this.bumpAuthz(existing.staff.user.id, tx);
      } else {
        await this.ensurePrimaryInvariant(tx, existing.staffId, null);
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_ASSIGNMENT_END",
          entity: "StaffAssignment",
          entityId: assignment.id,
          meta: { staffId: existing.staffId, endedAt, reason: dto.reason ?? null },
        },
        tx,
      );

      return assignment;
    });

    return { ok: true, assignment: result };
  }

  // ---------------- Provision user (preview + create) ----------------

  async provisionUserPreview(principal: Principal, staffId: string, dto: StaffProvisionUserPreviewDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true, user: true, credentials: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    // Enforce branch scope
    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }


    if (staff.user) {
      return {
        ok: false,
        message: "Staff already has a linked user",
        existingUser: { id: staff.user.id, email: staff.user.email, isActive: staff.user.isActive, role: staff.user.role },
      };
    }

    const roleVersion = await this.ctx.prisma.roleTemplateVersion.findFirst({
      where: {
        roleTemplate: { code: dto.roleCode },
        status: "ACTIVE" as any,
      },
      orderBy: [{ createdAt: "desc" }],
      include: { roleTemplate: true },
    });
    if (!roleVersion) throw new BadRequestException("Role not found or not ACTIVE");

    const existingEmail = await this.ctx.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingEmail) throw new ConflictException("Email is already taken");

    const now = new Date();
    const activeAssignments = staff.assignments.filter((a) => a.status !== "ENDED" && (!a.effectiveTo || a.effectiveTo > now));
    if (!activeAssignments.length) throw new BadRequestException("No active/planned assignments found for staff");

    // Planned bindings per assignment (RoleBindings per branch assignment)
    const bindingsPlan = activeAssignments.map((a) => ({
      branchId: a.branchId,
      roleVersionId: roleVersion.id,
      staffAssignmentId: a.id,
      isPrimary: !!a.isPrimary,
      effectiveFrom: a.effectiveFrom,
      effectiveTo: a.effectiveTo ?? null,
    }));

    // Warnings: expired credentials (Phase-1 informational)
    const warnings: string[] = [];
    for (const c of staff.credentials) {
      if (c.validTo && c.validTo <= now) warnings.push(`Credential expired: ${c.type} (${c.registrationNumber ?? "-"})`);
    }

    return {
      ok: true,
      staff: { id: staff.id, name: staff.name, empCode: staff.empCode },
      user: { email: dto.email.toLowerCase(), name: dto.name ?? staff.name },
      role: { code: dto.roleCode, roleVersionId: roleVersion.id },
      bindingsPlan,
      warnings,
      writes: false,
    };
  }

  async provisionUser(principal: Principal, staffId: string, dto: StaffProvisionUserDto) {
    const preview = await this.provisionUserPreview(principal, staffId, dto);
    if (!preview.ok) throw new BadRequestException((preview as any).message ?? "Cannot provision user");
    if ((preview as any).writes === true) throw new BadRequestException("Unexpected preview state");

    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true, user: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");
    if (staff.user) throw new ConflictException("Staff already has a linked user");

    const roleVersionId = (preview as any).role.roleVersionId as string;

    const tempPassword = generateTempPassword();
    const passwordHash = hashPassword(tempPassword);

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      // Determine primary branch for back-compat user.branchId
      const primaryAssignment = staff.assignments.find((a) => a.isPrimary) ?? staff.assignments[0];
      if (!primaryAssignment) throw new BadRequestException("No assignments found");

      // Create user (source=STAFF so IAM list hides it by default)
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: (dto.name ?? staff.name).trim(),
          phone: dto.phone ?? null,
          role: dto.roleCode,
          branchId: primaryAssignment.branchId,
          staffId: staff.id,
          source: "STAFF" as any,
          isActive: true,
          mustChangePassword: true,
          passwordHash,
          roleVersionId,
          authzVersion: 1,
        } as any,
      });

      // Create role bindings per assignment
      const bindings = (preview as any).bindingsPlan as Array<any>;
      await tx.userRoleBinding.createMany({
        data: bindings.map((b) => ({
          userId: user.id,
          branchId: b.branchId,
          roleVersionId: b.roleVersionId,
          staffAssignmentId: b.staffAssignmentId,
          isPrimary: b.isPrimary,
          isActive: true,
          effectiveFrom: new Date(b.effectiveFrom),
          effectiveTo: b.effectiveTo ? new Date(b.effectiveTo) : null,
        })),
        skipDuplicates: true,
      });

      await this.ensurePrimaryInvariant(tx, staff.id, user.id);

      await this.ctx.audit.log({
        branchId: null,
        actorUserId: principal.userId,
        action: "STAFF_PROVISION_USER",
        entity: "Staff",
        entityId: staff.id,
        meta: { userEmail: user.email, roleCode: dto.roleCode, roleVersionId, bindingCount: bindings.length },
      });

      return { userId: user.id, email: user.email, tempPassword };
    });

    return { ok: true, ...created };
  }



  // ---------------- Link / Unlink existing IAM users ----------------

  async linkExistingUser(principal: Principal, staffId: string, dto: StaffLinkUserDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true, user: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }


    const user = await this.ctx.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { roleVersion: { include: { roleTemplate: true } } },
    });
    if (!user) throw new NotFoundException("User not found");

    if (user.staffId && user.staffId !== staff.id) {
      throw new ConflictException("User is already linked to a different staff record");
    }

    const now = new Date();

    const activeAssignments = staff.assignments
      .filter((a) => ["ACTIVE", "PLANNED"].includes(String(a.status)))
      .filter((a) => !a.effectiveTo || a.effectiveTo.getTime() > now.getTime());

    if (!activeAssignments.length) throw new BadRequestException("No active assignments found");

    const preferredPrimary = dto.primaryBranchId ? String(dto.primaryBranchId) : null;
    const primaryAssignment =
      (preferredPrimary ? activeAssignments.find((a) => a.branchId === preferredPrimary) : null) ??
      activeAssignments.find((a) => a.isPrimary) ??
      activeAssignments[0];

    const roleCode = (dto.roleCode ?? user.role ?? "").trim().toUpperCase();
    if (!roleCode) throw new BadRequestException("roleCode is required for linking (missing on user)");

    const linked = await this.ctx.prisma.$transaction(async (tx) => {
      // If staff already linked to another user, optionally relink (disable old account)
      if (staff.user?.id && staff.user.id !== user.id) {
        if (!dto.forceRelink) throw new ConflictException("Staff already has a linked user");

        await tx.userRoleBinding.updateMany({
          where: { userId: staff.user.id, isActive: true },
          data: { isActive: false, effectiveTo: now },
        });

        await tx.user.update({
          where: { id: staff.user.id },
          data: { staffId: null, isActive: false, source: "ADMIN" as any, authzVersion: { increment: 1 } },
        });

        await this.ctx.audit.log(
          {
            branchId: null,
            actorUserId: principal.userId,
            action: "STAFF_USER_UNLINK",
            entity: "User",
            entityId: staff.user.id,
            meta: { staffId: staff.id, reason: "forceRelink" },
          },
          tx,
        );
      }

      const roleV = await tx.roleTemplateVersion.findFirst({
        where: { status: "ACTIVE", roleTemplate: { code: roleCode } },
        include: { roleTemplate: true },
      });
      if (!roleV) throw new BadRequestException(`Active role not found: ${roleCode}`);

      if (principal.roleScope === "BRANCH" && (roleV.roleTemplate as any).scope === "GLOBAL") {
        throw new ForbiddenException("Branch admins cannot assign global roles");
      }

      // Reset bindings so staff assignments are the source of truth
      await tx.userRoleBinding.deleteMany({ where: { userId: user.id } });

      const nextBranchId = (roleV.roleTemplate as any).scope === "BRANCH" ? primaryAssignment.branchId : null;

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          staffId: staff.id,
          source: "STAFF" as any,
          role: roleCode,
          roleVersionId: roleV.id,
          branchId: nextBranchId,
          isActive: true,
          authzVersion: { increment: 1 },
        } as any,
      });

      for (const a of activeAssignments) {
        await this.upsertRoleBindingForAssignment(tx, updatedUser as any, {
          id: a.id,
          branchId: a.branchId,
          isPrimary: a.branchId === primaryAssignment.branchId,
          status: a.status,
          effectiveFrom: a.effectiveFrom,
          effectiveTo: a.effectiveTo,
        });
      }

      await this.ensurePrimaryInvariant(tx, staff.id, updatedUser.id);

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_USER_LINK",
          entity: "Staff",
          entityId: staff.id,
          meta: {
            userId: updatedUser.id,
            roleCode,
            roleVersionId: roleV.id,
            primaryBranchId: primaryAssignment.branchId,
            bindingCount: activeAssignments.length,
            reason: dto.reason ?? null,
          },
        },
        tx,
      );

      return { userId: updatedUser.id, email: updatedUser.email };
    });

    return { ok: true, ...linked };
  }

  async unlinkUser(principal: Principal, staffId: string, dto: StaffUnlinkUserDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true, assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");
    if (!staff.user?.id) throw new BadRequestException("No linked user");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }


    const now = new Date();

    const res = await this.ctx.prisma.$transaction(async (tx) => {
      await tx.userRoleBinding.updateMany({
        where: { userId: staff.user!.id, isActive: true },
        data: { isActive: false, effectiveTo: now },
      });

      await tx.user.update({
        where: { id: staff.user!.id },
        data: { staffId: null, isActive: false, source: "ADMIN" as any, authzVersion: { increment: 1 } },
      });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_USER_UNLINK",
          entity: "Staff",
          entityId: staff.id,
          meta: { userId: staff.user!.id, reason: dto.reason ?? null },
        },
        tx,
      );

      return { userId: staff.user!.id };
    });

    return { ok: true, ...res };
  }

  // ---------------- PCPNDT-sensitive marker ----------------

  async setUsgAuthorization(principal: Principal, staffId: string, dto: StaffUsgAuthorizationDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }


    const now = new Date();

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const s = await tx.staff.update({
        where: { id: staffId },
        data: {
          isUsgAuthorized: !!dto.isUsgAuthorized,
          usgAuthorizedAt: dto.isUsgAuthorized ? now : null,
          usgAuthorizedByUserId: dto.isUsgAuthorized ? principal.userId : null,
          usgAuthorizationNotes: dto.notes ?? null,
        } as any,
      });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_USG_AUTH_UPDATE",
          entity: "Staff",
          entityId: staffId,
          meta: { isUsgAuthorized: !!dto.isUsgAuthorized, notes: dto.notes ?? null },
        },
        tx,
      );

      return s;
    });

    return { ok: true, staff: updated };
  }

  // ---------------- Credentials + expiry ----------------

  async addCredential(principal: Principal, staffId: string, dto: CreateStaffCredentialDto) {
    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    // branch scope: must share at least one branch assignment
    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }


    const now = new Date();
    const isVerified = dto.verificationStatus === "VERIFIED";

    const created = await this.ctx.prisma.staffCredential.create({
      data: {
        staffId,
        type: (dto.type as any) ?? undefined,
        authority: dto.authority ?? null,
        registrationNumber: dto.registrationNumber ?? null,
        validFrom: parseDate(dto.validFrom ?? null),
        validTo: parseDate(dto.validTo ?? null),
        verificationStatus: (dto.verificationStatus as any) ?? undefined,
        verifiedAt: isVerified ? now : null,
        verifiedByUserId: isVerified ? principal.userId : null,
        documentUrl: dto.documentUrl ?? null,
      },
    });

    await this.ctx.audit.log({
      branchId: null,
      actorUserId: principal.userId,
      action: "STAFF_CREDENTIAL_ADD",
      entity: "StaffCredential",
      entityId: created.id,
      meta: { staffId, ...dto },
    });

    return created;
  }

  async updateCredential(principal: Principal, credentialId: string, dto: UpdateStaffCredentialDto) {
    const row = await this.ctx.prisma.staffCredential.findUnique({
      where: { id: credentialId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!row) throw new NotFoundException("Credential not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!row.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const now = new Date();
    const willSetVerified = dto.verificationStatus === "VERIFIED" && row.verificationStatus !== ("VERIFIED" as any);
    const willUnsetVerified =
      dto.verificationStatus !== undefined && dto.verificationStatus !== "VERIFIED" && row.verificationStatus === ("VERIFIED" as any);

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      // Enforce evidence before verifying (industry-grade workflow)
      if (dto.verificationStatus === "VERIFIED") {
        const evidenceCount = await tx.staffCredentialEvidence.count({ where: { staffCredentialId: credentialId } });
        const effectiveUrl = dto.documentUrl ?? row.documentUrl;
        if (evidenceCount === 0 && !effectiveUrl) {
          throw new BadRequestException("Add at least one evidence document (or documentUrl) before setting VERIFIED");
        }
      }

      const cred = await tx.staffCredential.update({
        where: { id: credentialId },
        data: {
          type: (dto.type as any) ?? undefined,
          authority: dto.authority ?? undefined,
          registrationNumber: dto.registrationNumber ?? undefined,
          validFrom: dto.validFrom !== undefined ? parseDate(dto.validFrom ?? null) : undefined,
          validTo: dto.validTo !== undefined ? parseDate(dto.validTo ?? null) : undefined,
          verificationStatus: (dto.verificationStatus as any) ?? undefined,
          verifiedAt: willSetVerified ? now : willUnsetVerified ? null : undefined,
          verifiedByUserId: willSetVerified ? principal.userId : willUnsetVerified ? null : undefined,
          documentUrl: dto.documentUrl ?? undefined,
        },
      });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_CREDENTIAL_UPDATE",
          entity: "StaffCredential",
          entityId: cred.id,
          meta: { staffId: row.staffId, ...dto },
        },
        tx,
      );

      return cred;
    });

    return updated;
  }

  async listCredentialExpiryDue(principal: Principal, q: { days: number; branchId?: string | null; includeExpired?: boolean }) {
    const days = Number.isFinite(q.days) ? Math.min(Math.max(q.days, 1), 365) : 60;
    const until = new Date(Date.now() + days * 24 * 3600 * 1000);
    const now = new Date();

    // Branch scoping:
    let allowedBranches: string[] | null = null;
    if (principal.roleScope !== "GLOBAL") {
      allowedBranches = this.allowedBranchIds(principal);
    } else if (q.branchId) {
      allowedBranches = [q.branchId];
    }

    const rows = await this.ctx.prisma.staffCredential.findMany({
      where: {
        validTo: q.includeExpired ? { lte: until } : { lte: until, gt: now },
        staff: allowedBranches ? { assignments: { some: { branchId: { in: allowedBranches } } } } : undefined,
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true, phone: true, email: true } },
      },
      orderBy: [{ validTo: "asc" }],
      take: 500,
    });

    return { days, until, count: rows.length, rows };
  }

  // ---------------- Suspend / Reactivate / Offboard ----------------

  async suspendStaff(principal: Principal, staffId: string, dto: StaffSuspendDto) {
    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { user: true, assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const from = parseDate(dto.suspendedFrom) ?? new Date();
    const to = parseDate(dto.suspendedTo ?? null);
    if (to && to.getTime() <= from.getTime()) throw new BadRequestException("suspendedTo must be after suspendedFrom");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const s = await tx.staff.update({
        where: { id: staffId },
        data: {
          status: "SUSPENDED" as any,
          isActive: false,
          suspendedAt: from,
          suspendedUntil: to,
          suspensionReason: dto.reason ?? null,
        } as any,
      });

      if (staff.user?.id) {
        await tx.user.update({ where: { id: staff.user.id }, data: { isActive: false, authzVersion: { increment: 1 } } });
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_SUSPEND",
          entity: "Staff",
          entityId: staffId,
          meta: { reason: dto.reason ?? null, suspendedFrom: from.toISOString(), suspendedTo: to ? to.toISOString() : null },
        },
        tx,
      );

      return s;
    });

    return { ok: true, staff: updated };
  }

  async reactivateStaff(principal: Principal, staffId: string) {
    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { user: true, assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const s = await tx.staff.update({
        where: { id: staffId },
        data: {
          status: "ACTIVE" as any,
          isActive: true,
          suspendedAt: null,
          suspendedUntil: null,
          suspensionReason: null,
        } as any,
      });

      if (staff.user?.id) {
        await tx.user.update({ where: { id: staff.user.id }, data: { isActive: true, authzVersion: { increment: 1 } } });
      }

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_REACTIVATE",
          entity: "Staff",
          entityId: staffId,
          meta: {},
        },
        tx,
      );

      return s;
    });

    return { ok: true, staff: updated };
  }

  async offboardStaff(principal: Principal, staffId: string, dto: StaffOffboardDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true, assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }


    const now = new Date();

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      // end assignments
      await tx.staffAssignment.updateMany({
        where: { staffId, status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] as any } },
        data: { status: "ENDED" as any, effectiveTo: now, isPrimary: false },
      });

      // deactivate role bindings
      if (staff.user?.id) {
        await tx.userRoleBinding.updateMany({
          where: { userId: staff.user.id, isActive: true },
          data: { isActive: false, effectiveTo: now },
        });

        await tx.user.update({
          where: { id: staff.user.id },
          data: { isActive: false, authzVersion: { increment: 1 } },
        });
      }

      const s = await tx.staff.update({
        where: { id: staffId },
        data: { status: "OFFBOARDED" as any, isActive: false, suspendedAt: null, suspendedUntil: null, suspensionReason: null } as any,
      });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_OFFBOARD",
          entity: "Staff",
          entityId: staffId,
          meta: { reason: dto.reason ?? null, endedAt: now.toISOString() },
        },
        tx,
      );

      return s;
    });

    return { ok: true, staff: updated };
  }

  // ---------------- Merge workflow ----------------

  async mergePreview(principal: Principal, dto: StaffMergePreviewDto) {
    if (dto.sourceStaffId === dto.targetStaffId) throw new BadRequestException("sourceStaffId and targetStaffId must differ");

    const [source, target] = await Promise.all([
      this.ctx.prisma.staff.findUnique({
        where: { id: dto.sourceStaffId },
        include: { assignments: true, credentials: true, identifiers: true, user: true },
      }),
      this.ctx.prisma.staff.findUnique({
        where: { id: dto.targetStaffId },
        include: { assignments: true, credentials: true, identifiers: true, user: true },
      }),
    ]);
    if (!source || !target) throw new NotFoundException("Source/Target staff not found");

    // Branch scope: admin must have access to ALL branches involved (safe)
    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const allBranches = uniq([...source.assignments.map((a) => a.branchId), ...target.assignments.map((a) => a.branchId)]);
      const ok = allBranches.every((b) => allowed.includes(b));
      if (!ok) throw new ForbiddenException("Forbidden");
    }

    const conflicts: string[] = [];
    if (source.user && target.user) conflicts.push("Both source and target have linked user accounts. Resolve manually.");

    return {
      ok: true,
      source: {
        id: source.id,
        empCode: source.empCode,
        name: source.name,
        user: source.user ? { id: source.user.id, email: source.user.email } : null,
      },
      target: {
        id: target.id,
        empCode: target.empCode,
        name: target.name,
        user: target.user ? { id: target.user.id, email: target.user.email } : null,
      },
      moveCounts: {
        assignments: source.assignments.length,
        credentials: source.credentials.length,
        identifiers: source.identifiers.length,
      },
      conflicts,
    };
  }

  async mergeStaff(principal: Principal, dto: StaffMergeDto) {
    const preview = await this.mergePreview(principal, dto);
    const conflicts = (preview as any).conflicts as string[];
    if (conflicts?.length) throw new ConflictException(conflicts.join("; "));

    const sourceId = dto.sourceStaffId;
    const targetId = dto.targetStaffId;

    const result = await this.ctx.prisma.$transaction(async (tx) => {
      // Move assignments/credentials/identifiers
      await tx.staffAssignment.updateMany({ where: { staffId: sourceId }, data: { staffId: targetId } });
      await tx.staffCredential.updateMany({ where: { staffId: sourceId }, data: { staffId: targetId } });

      // identifiers can violate @@unique([type,valueHash]) — move carefully
      const ids = await tx.staffIdentifier.findMany({ where: { staffId: sourceId } });
      for (const idRow of ids) {
        const exists = await tx.staffIdentifier.findFirst({
          where: { type: idRow.type as any, valueHash: idRow.valueHash, staffId: targetId },
          select: { id: true },
        });
        if (!exists) {
          await tx.staffIdentifier.update({ where: { id: idRow.id }, data: { staffId: targetId } });
        } else {
          // delete duplicate identifier record from source
          await tx.staffIdentifier.delete({ where: { id: idRow.id } });
        }
      }

      // Move DepartmentDoctor assignments and Department heads
      await tx.departmentDoctor.updateMany({ where: { staffId: sourceId }, data: { staffId: targetId } });
      await tx.department.updateMany({ where: { headStaffId: sourceId }, data: { headStaffId: targetId } });

      // EquipmentMaintenanceTask performedByStaffId
      await tx.equipmentMaintenanceTask.updateMany({ where: { performedByStaffId: sourceId }, data: { performedByStaffId: targetId } });

      // If source had user and target doesn't, move user link
      const source = await tx.staff.findUnique({ where: { id: sourceId }, include: { user: true } });
      const target = await tx.staff.findUnique({ where: { id: targetId }, include: { user: true } });
      if (!source || !target) throw new NotFoundException("Source/Target staff not found");
      if (source.user && !target.user) {
        await tx.user.update({ where: { id: source.user.id }, data: { staffId: targetId, authzVersion: { increment: 1 } } });
      }

      // Write merge log
      const log = await tx.staffMergeLog.create({
        data: {
          sourceStaffId: sourceId,
          targetStaffId: targetId,
          reason: dto.reason ?? null,
          notes: dto.notes ?? null,
          mergedByUserId: principal.userId,
        },
      });

      // Soft-disable source staff (keeps audit trace)
      await tx.staff.update({
        where: { id: sourceId },
        data: { status: "OFFBOARDED" as any, isActive: false, suspendedAt: null, suspendedUntil: null, suspensionReason: null },
      });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_MERGE",
          entity: "StaffMergeLog",
          entityId: log.id,
          meta: { sourceStaffId: sourceId, targetStaffId: targetId, reason: dto.reason ?? null },
        },
        tx,
      );

      return { mergeLogId: log.id };
    });

    return { ok: true, ...result };
  }

  // ---------------- Identifiers (DPDP-safe) ----------------

  async addIdentifier(principal: Principal, staffId: string, dto: StaffIdentifierInputDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const ok = staff.assignments.some((a) => allowed.includes(a.branchId));
      if (!ok) throw new ForbiddenException("Forbidden");
    }

    const type = String(dto.type ?? "").trim();
    const norm = normalizeIdentifierValue(type, dto.value);
    if (!type || !norm) throw new BadRequestException("Invalid identifier");
    const valueHash = hashIdentifier(type, norm);
    const valueLast4 = last4(norm);

    // Identifiers are unique across staff
    const existing = await this.ctx.prisma.staffIdentifier.findFirst({
      where: { type: type as any, valueHash },
      select: { id: true, staffId: true, type: true, valueLast4: true },
    });
    if (existing && existing.staffId !== staffId) {
      throw new ConflictException({
        message: "Identifier already linked to a different staff",
        identifier: { type: existing.type, valueLast4: existing.valueLast4 },
        existingStaffId: existing.staffId,
      });
    }
    if (existing && existing.staffId === staffId) {
      return { ok: true, identifierId: existing.id };
    }

    const created = await this.ctx.prisma.staffIdentifier.create({
      data: {
        staffId,
        type: type as any,
        valueHash,
        valueLast4,
        issuedBy: dto.issuedBy?.trim() || null,
        issuedAt: parseDate(dto.issuedAt ?? null),
      },
      select: { id: true },
    });

    await this.ctx.audit.log({
      branchId: null,
      actorUserId: principal.userId,
      action: "STAFF_IDENTIFIER_ADD",
      entity: "StaffIdentifier",
      entityId: created.id,
      meta: { staffId, type, valueLast4 },
    });

    return { ok: true, identifierId: created.id };
  }

  async removeIdentifier(principal: Principal, identifierId: string) {
    const ident = await this.ctx.prisma.staffIdentifier.findUnique({
      where: { id: identifierId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!ident) throw new NotFoundException("Identifier not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      const ok = (ident.staff?.assignments ?? []).some((a) => allowed.includes(a.branchId));
      if (!ok) throw new ForbiddenException("Forbidden");
    }

    await this.ctx.prisma.staffIdentifier.delete({ where: { id: identifierId } });

    await this.ctx.audit.log({
      branchId: null,
      actorUserId: principal.userId,
      action: "STAFF_IDENTIFIER_REMOVE",
      entity: "StaffIdentifier",
      entityId: identifierId,
      meta: { staffId: ident.staffId, type: ident.type, valueLast4: ident.valueLast4 },
    });

    return { ok: true };
  }

  // ---------------- Audit trail ----------------

  async getStaffAuditTrail(principal: Principal, staffId: string, q: { take?: number } = {}) {
    // Re-use profile checks for branch scoping
    await this.getStaffProfile(principal, staffId);

    const take = q.take && Number.isFinite(q.take) ? Math.min(Math.max(q.take, 1), 500) : 100;

    const where: any = {
      OR: [
        { entity: "Staff", entityId: staffId },
        { meta: { path: ["staffId"], equals: staffId } },
        { meta: { path: ["sourceStaffId"], equals: staffId } },
        { meta: { path: ["targetStaffId"], equals: staffId } },
      ],
    };

    const rows = await this.ctx.prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take,
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
      },
    });

    return { items: rows };
  }

  // ---------------- Reports ----------------

  async reportHeadcount(principal: Principal, q: { groupBy: "branch" | "department" | "category"; branchId?: string | null }) {
    const now = new Date();

    // Resolve branch filter under RBAC scope
    let branchIds: string[] | null = null;
    if (principal.roleScope !== "GLOBAL") {
      branchIds = this.allowedBranchIds(principal);
    } else if (q.branchId) {
      branchIds = [q.branchId];
    }

    const assignmentWhere: any = {
      status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      ...(branchIds ? { branchId: { in: branchIds } } : {}),
    };

    if (q.groupBy === "branch") {
      const groups = await this.ctx.prisma.staffAssignment.groupBy({
        by: ["branchId"],
        where: assignmentWhere,
        _count: { _all: true },
      });

      const branchMap = new Map(
        (
          branchIds
            ? await this.ctx.prisma.branch.findMany({ where: { id: { in: groups.map((g) => g.branchId) } }, select: { id: true, code: true, name: true } })
            : await this.ctx.prisma.branch.findMany({ where: { id: { in: groups.map((g) => g.branchId) } }, select: { id: true, code: true, name: true } })
        ).map((b) => [b.id, b]),
      );

      return {
        groupBy: "branch",
        items: groups
          .sort((a, b) => (a.branchId < b.branchId ? -1 : 1))
          .map((g) => ({ branchId: g.branchId, branch: branchMap.get(g.branchId) ?? null, headcount: g._count._all })),
      };
    }

    if (q.groupBy === "department") {
      const groups = await this.ctx.prisma.staffAssignment.groupBy({
        by: ["departmentId"],
        where: assignmentWhere,
        _count: { _all: true },
      });

      const deptIds = groups.map((g) => g.departmentId).filter(Boolean) as string[];
      const deptMap = new Map(
        deptIds.length
          ? (await this.ctx.prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, code: true, name: true } })).map((d) => [d.id, d])
          : [],
      );

      return {
        groupBy: "department",
        items: groups.map((g) => ({
          departmentId: g.departmentId,
          department: g.departmentId ? deptMap.get(g.departmentId) ?? null : null,
          headcount: g._count._all,
        })),
      };
    }

    // category
    const rows = await this.ctx.prisma.staffAssignment.findMany({
      where: assignmentWhere,
      select: { staffId: true },
      take: 50000,
    });
    const staffIds = uniq(rows.map((r) => r.staffId));
    const staff = await this.ctx.prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { category: true } });
    const counts = staff.reduce((acc: any, s) => {
      const k = String(s.category);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

    return {
      groupBy: "category",
      items: Object.entries(counts).map(([category, headcount]) => ({ category, headcount })),
    };
  }

  async reportActiveUsersVsStaff(principal: Principal, q: { branchId?: string | null }) {
    let branchIds: string[] | null = null;
    if (principal.roleScope !== "GLOBAL") {
      branchIds = this.allowedBranchIds(principal);
    } else if (q.branchId) {
      branchIds = [q.branchId];
    }

    // staff considered active if they have at least one active/planned assignment within scope
    const staffCount = await this.ctx.prisma.staff.count({
      where: {
        isActive: true,
        ...(branchIds
          ? { assignments: { some: { branchId: { in: branchIds }, status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] } } } }
          : {}),
      },
    });

    const userCount = await this.ctx.prisma.user.count({
      where: {
        isActive: true,
        staffId: { not: null },
        ...(branchIds ? { roleBindings: { some: { branchId: { in: branchIds }, isActive: true } } } : {}),
      } as any,
    });

    return { activeStaff: staffCount, activeUsersLinkedToStaff: userCount };
  }

  async reportCrossBranchSharedStaff(principal: Principal, q: { branchId?: string | null }) {
    // "Shared" means currently has active assignments in more than 1 distinct branch
    const now = new Date();
    let branchIds: string[] | null = null;
    if (principal.roleScope !== "GLOBAL") {
      branchIds = this.allowedBranchIds(principal);
    } else if (q.branchId) {
      branchIds = [q.branchId];
    }

    const where: any = {
      status: { in: ["ACTIVE", "PLANNED", "SUSPENDED"] },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      ...(branchIds ? { branchId: { in: branchIds } } : {}),
    };

    const groups = await this.ctx.prisma.staffAssignment.groupBy({
      by: ["staffId"],
      where,
      _count: { branchId: true },
      having: { branchId: { _count: { gt: 1 } } } as any,
      orderBy: { staffId: "asc" },
      take: 2000,
    });

    const staffIds = groups.map((g) => g.staffId);
    const staff = await this.ctx.prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, empCode: true, name: true, category: true, status: true, isActive: true },
    });

    return { items: staff };
  }

  // ---------------- Documents vault ----------------

  async listStaffDocuments(
    principal: Principal,
    staffId: string,
    q: { type?: string | null; branchId?: string | null; includeInactive?: boolean },
  ) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    } else if (q.branchId) {
      this.assertCanOperateOnBranch(principal, q.branchId);
    }

    const where: any = { staffId };
    if (q.type) where.type = q.type;
    if (q.branchId) where.branchId = q.branchId;
    if (!q.includeInactive) where.isActive = true;

    const items = await this.ctx.prisma.staffDocument.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        uploadedByUser: { select: { id: true, email: true } },
        verifiedByUser: { select: { id: true, email: true } },
        branch: { select: { id: true, code: true, name: true } },
        staffAssignment: { select: { id: true, branchId: true, isPrimary: true, status: true } },
      },
      take: 500,
    });

    return { items };
  }

  async addStaffDocument(principal: Principal, staffId: string, dto: CreateStaffDocumentDto) {
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: { assignments: true },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }
    if (dto.branchId) this.assertCanOperateOnBranch(principal, dto.branchId);

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      if (dto.staffAssignmentId) {
        const a = await tx.staffAssignment.findUnique({ where: { id: dto.staffAssignmentId }, select: { id: true, staffId: true, branchId: true } });
        if (!a || a.staffId !== staffId) throw new BadRequestException("Invalid staffAssignmentId");
        if (dto.branchId && a.branchId !== dto.branchId) throw new BadRequestException("staffAssignment branch mismatch");
      }

      const doc = await tx.staffDocument.create({
        data: {
          staffId,
          type: (dto.type as any) ?? undefined,
          title: dto.title ?? null,
          description: dto.description ?? null,
          refNo: dto.refNo ?? null,
          issuedBy: dto.issuedBy ?? null,
          issuedAt: parseDate(dto.issuedAt ?? null),
          validFrom: parseDate(dto.validFrom ?? null),
          validTo: parseDate(dto.validTo ?? null),
          fileUrl: dto.fileUrl,
          fileMime: dto.fileMime ?? null,
          fileSizeBytes: (dto as any).fileSizeBytes ?? null,
          checksum: dto.checksum ?? null,
          tags: dto.tags ?? null,
          branchId: dto.branchId ?? null,
          staffAssignmentId: dto.staffAssignmentId ?? null,
          uploadedByUserId: principal.userId,
          verificationStatus: "UNVERIFIED" as any,
          isActive: true,
        } as any,
      });

      if (dto.setAsStaffPointer) {
        const patch: any = {};
        if (doc.type === ("PROFILE_PHOTO" as any)) patch.profilePhotoDocumentId = doc.id;
        if (doc.type === ("SIGNATURE" as any)) patch.signatureDocumentId = doc.id;
        if (doc.type === ("STAMP" as any)) patch.stampDocumentId = doc.id;
        if (Object.keys(patch).length) await tx.staff.update({ where: { id: staffId }, data: patch });
      }

      await this.ctx.audit.log(
        {
          branchId: dto.branchId ?? null,
          actorUserId: principal.userId,
          action: "STAFF_DOCUMENT_ADD",
          entity: "StaffDocument",
          entityId: doc.id,
          meta: { staffId, type: dto.type, title: dto.title, refNo: dto.refNo },
        },
        tx,
      );

      return doc;
    });

    return created;
  }

  async updateStaffDocument(principal: Principal, documentId: string, dto: UpdateStaffDocumentDto) {
    const row = await this.ctx.prisma.staffDocument.findUnique({
      where: { id: documentId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!row) throw new NotFoundException("Document not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!row.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const data: any = {
      type: (dto.type as any) ?? undefined,
      title: dto.title === undefined ? undefined : dto.title,
      description: dto.description === undefined ? undefined : dto.description,
      refNo: dto.refNo === undefined ? undefined : dto.refNo,
      issuedBy: dto.issuedBy === undefined ? undefined : dto.issuedBy,
      issuedAt: dto.issuedAt !== undefined ? parseDate(dto.issuedAt ?? null) : undefined,
      validFrom: dto.validFrom !== undefined ? parseDate(dto.validFrom ?? null) : undefined,
      validTo: dto.validTo !== undefined ? parseDate(dto.validTo ?? null) : undefined,
      fileUrl: dto.fileUrl ?? undefined,
      fileMime: dto.fileMime === undefined ? undefined : dto.fileMime,
      fileSizeBytes: (dto as any).fileSizeBytes === undefined ? undefined : (dto as any).fileSizeBytes,
      checksum: dto.checksum === undefined ? undefined : dto.checksum,
      tags: dto.tags === undefined ? undefined : dto.tags,
      isActive: dto.isActive === undefined ? undefined : dto.isActive,
    };

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const doc = await tx.staffDocument.update({ where: { id: documentId }, data });

      if (dto.setAsStaffPointer) {
        const patch: any = {};
        if (doc.type === ("PROFILE_PHOTO" as any)) patch.profilePhotoDocumentId = doc.id;
        if (doc.type === ("SIGNATURE" as any)) patch.signatureDocumentId = doc.id;
        if (doc.type === ("STAMP" as any)) patch.stampDocumentId = doc.id;
        if (Object.keys(patch).length) await tx.staff.update({ where: { id: row.staffId }, data: patch });
      }

      await this.ctx.audit.log(
        {
          branchId: row.branchId ?? null,
          actorUserId: principal.userId,
          action: "STAFF_DOCUMENT_UPDATE",
          entity: "StaffDocument",
          entityId: doc.id,
          meta: { staffId: row.staffId, changes: dto },
        },
        tx,
      );

      return doc;
    });

    return updated;
  }

  async verifyStaffDocument(principal: Principal, documentId: string, dto: VerifyStaffDocumentDto) {
    const row = await this.ctx.prisma.staffDocument.findUnique({
      where: { id: documentId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!row) throw new NotFoundException("Document not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!row.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const now = new Date();
    const toVerified = dto.verificationStatus === "VERIFIED" || dto.verificationStatus === "REJECTED";

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const doc = await tx.staffDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: dto.verificationStatus as any,
          verifiedAt: toVerified ? now : null,
          verifiedByUserId: toVerified ? principal.userId : null,
          verificationNotes: dto.verificationNotes ?? null,
        },
      });

      await this.ctx.audit.log(
        {
          branchId: row.branchId ?? null,
          actorUserId: principal.userId,
          action: "STAFF_DOCUMENT_VERIFY",
          entity: "StaffDocument",
          entityId: doc.id,
          meta: { staffId: row.staffId, status: dto.verificationStatus, notes: dto.verificationNotes ?? null },
        },
        tx,
      );

      return doc;
    });

    return updated;
  }

  async deactivateStaffDocument(principal: Principal, documentId: string) {
    const row = await this.ctx.prisma.staffDocument.findUnique({ where: { id: documentId } });
    if (!row) throw new NotFoundException("Document not found");

    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: row.staffId }, include: { assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const doc = await tx.staffDocument.update({ where: { id: documentId }, data: { isActive: false } });

      // If this doc is pointed as profile photo/signature/stamp, clear it.
      const patch: any = {};
      if ((staff as any).profilePhotoDocumentId === documentId) patch.profilePhotoDocumentId = null;
      if ((staff as any).signatureDocumentId === documentId) patch.signatureDocumentId = null;
      if ((staff as any).stampDocumentId === documentId) patch.stampDocumentId = null;
      if (Object.keys(patch).length) await tx.staff.update({ where: { id: row.staffId }, data: patch });

      await this.ctx.audit.log(
        {
          branchId: row.branchId ?? null,
          actorUserId: principal.userId,
          action: "STAFF_DOCUMENT_DEACTIVATE",
          entity: "StaffDocument",
          entityId: doc.id,
          meta: { staffId: row.staffId },
        },
        tx,
      );

      return doc;
    });

    return { ok: true, document: updated };
  }

  async listDocumentExpiryDue(principal: Principal, q: { days: number; branchId?: string | null; includeExpired?: boolean }) {
    const days = Number.isFinite(q.days) ? Math.min(Math.max(q.days, 1), 365) : 60;
    const until = new Date(Date.now() + days * 24 * 3600 * 1000);
    const now = new Date();

    // Branch scoping:
    let allowedBranches: string[] | null = null;
    if (principal.roleScope !== "GLOBAL") {
      allowedBranches = this.allowedBranchIds(principal);
    } else if (q.branchId) {
      allowedBranches = [q.branchId];
    }

    const rows = await this.ctx.prisma.staffDocument.findMany({
      where: {
        isActive: true,
        validTo: q.includeExpired ? { lte: until } : { lte: until, gt: now },
        staff: allowedBranches ? { assignments: { some: { branchId: { in: allowedBranches } } } } : undefined,
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true, phone: true, email: true } },
      },
      orderBy: [{ validTo: "asc" }],
      take: 500,
    });

    return { days, until, count: rows.length, items: rows };
  }

  async getExpirySummary(principal: Principal, q: { days: number; branchId?: string | null }) {
    const days = Number.isFinite(q.days) ? Math.min(Math.max(q.days, 1), 365) : 60;
    const until = new Date(Date.now() + days * 24 * 3600 * 1000);
    const now = new Date();

    let allowedBranches: string[] | null = null;
    if (principal.roleScope !== "GLOBAL") allowedBranches = this.allowedBranchIds(principal);
    else if (q.branchId) allowedBranches = [q.branchId];

    const staffScope = allowedBranches ? { assignments: { some: { branchId: { in: allowedBranches } } } } : undefined;

    const [
      credExpiringSoon,
      credExpired,
      docExpiringSoon,
      docExpired,
      credUnverifiedOrPending,
      docUnverifiedOrPending,
    ] = await Promise.all([
      this.ctx.prisma.staffCredential.count({ where: { validTo: { lte: until, gt: now }, staff: staffScope } }),
      this.ctx.prisma.staffCredential.count({ where: { validTo: { lte: now }, staff: staffScope } }),
      this.ctx.prisma.staffDocument.count({ where: { isActive: true, validTo: { lte: until, gt: now }, staff: staffScope } }),
      this.ctx.prisma.staffDocument.count({ where: { isActive: true, validTo: { lte: now }, staff: staffScope } }),
      this.ctx.prisma.staffCredential.count({ where: { verificationStatus: { in: ["UNVERIFIED", "PENDING"] as any }, staff: staffScope } }),
      this.ctx.prisma.staffDocument.count({ where: { isActive: true, verificationStatus: { in: ["UNVERIFIED", "PENDING"] as any }, staff: staffScope } }),
    ]);

    return {
      days,
      until,
      scope: { branchIds: allowedBranches },
      credentials: { expiringSoon: credExpiringSoon, expired: credExpired, unverifiedOrPending: credUnverifiedOrPending },
      documents: { expiringSoon: docExpiringSoon, expired: docExpired, unverifiedOrPending: docUnverifiedOrPending },
    };
  }

  // ---------------- Credential evidence ----------------

  async addCredentialEvidence(principal: Principal, credentialId: string, dto: AddStaffCredentialEvidenceDto) {
    const cred = await this.ctx.prisma.staffCredential.findUnique({
      where: { id: credentialId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!cred) throw new NotFoundException("Credential not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!cred.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const doc = await this.ctx.prisma.staffDocument.findUnique({ where: { id: dto.staffDocumentId } });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.staffId !== cred.staffId) throw new BadRequestException("Evidence document must belong to the same staff");

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const ev = await tx.staffCredentialEvidence.create({
        data: { staffCredentialId: credentialId, staffDocumentId: dto.staffDocumentId },
      });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_CREDENTIAL_EVIDENCE_ADD",
          entity: "StaffCredentialEvidence",
          entityId: ev.id,
          meta: { staffId: cred.staffId, credentialId, staffDocumentId: dto.staffDocumentId },
        },
        tx,
      );

      return ev;
    });

    return created;
  }

  async removeCredentialEvidence(principal: Principal, evidenceId: string) {
    const ev = await this.ctx.prisma.staffCredentialEvidence.findUnique({
      where: { id: evidenceId },
      include: {
        staffCredential: { include: { staff: { include: { assignments: true } } } },
      },
    });
    if (!ev) throw new NotFoundException("Evidence not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!ev.staffCredential.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.staffCredentialEvidence.delete({ where: { id: evidenceId } });

      await this.ctx.audit.log(
        {
          branchId: null,
          actorUserId: principal.userId,
          action: "STAFF_CREDENTIAL_EVIDENCE_REMOVE",
          entity: "StaffCredentialEvidence",
          entityId: evidenceId,
          meta: { staffId: ev.staffCredential.staffId, credentialId: ev.staffCredentialId, staffDocumentId: ev.staffDocumentId },
        },
        tx,
      );
    });

    return { ok: true };
  }

  // ---------------- Privileges ----------------

  async listPrivilegeGrants(principal: Principal, staffId: string, q: { branchId?: string | null }) {
    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
      if (q.branchId && !allowed.includes(q.branchId)) throw new ForbiddenException("Forbidden");
    } else if (q.branchId) {
      this.assertCanOperateOnBranch(principal, q.branchId);
    }

    const where: any = { staffId };
    if (q.branchId) where.branchId = q.branchId;

    const items = await this.ctx.prisma.staffPrivilegeGrant.findMany({
      where,
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        staffAssignment: { select: { id: true, branchId: true, isPrimary: true, status: true } },
        grantedByUser: { select: { id: true, email: true } },
      },
      take: 500,
    });

    return { items };
  }

  async addPrivilegeGrant(principal: Principal, staffId: string, dto: CreateStaffPrivilegeGrantDto) {
    this.assertCanOperateOnBranch(principal, dto.branchId);

    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const { from, to } = this.normalizeDateRange((dto as any).effectiveFrom ?? null, (dto as any).effectiveTo ?? null, true);

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      if (dto.staffAssignmentId) {
        const a = await tx.staffAssignment.findUnique({ where: { id: dto.staffAssignmentId }, select: { id: true, staffId: true, branchId: true } });
        if (!a || a.staffId !== staffId) throw new BadRequestException("Invalid staffAssignmentId");
        if (a.branchId !== dto.branchId) throw new BadRequestException("staffAssignment branch mismatch");
      }

      const grant = await tx.staffPrivilegeGrant.create({
        data: {
          staffId,
          branchId: dto.branchId,
          staffAssignmentId: dto.staffAssignmentId ?? null,
          area: dto.area as any,
          action: dto.action as any,
          targetType: (dto.targetType as any) ?? undefined,
          targetId: dto.targetId ?? null,
          targetMeta: dto.targetMeta ?? null,
          status: (dto.status as any) ?? undefined,
          effectiveFrom: from,
          effectiveTo: to,
          grantedByUserId: principal.userId,
          notes: dto.notes ?? null,
        } as any,
      });

      await this.ctx.audit.log(
        {
          branchId: dto.branchId,
          actorUserId: principal.userId,
          action: "STAFF_PRIVILEGE_GRANT",
          entity: "StaffPrivilegeGrant",
          entityId: grant.id,
          meta: { staffId, ...dto },
        },
        tx,
      );

      return grant;
    });

    return created;
  }

  async updatePrivilegeGrant(principal: Principal, grantId: string, dto: UpdateStaffPrivilegeGrantDto) {
    const row = await this.ctx.prisma.staffPrivilegeGrant.findUnique({
      where: { id: grantId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!row) throw new NotFoundException("Privilege grant not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!row.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const { from, to } = this.normalizeDateRange((dto as any).effectiveFrom ?? null, (dto as any).effectiveTo ?? null, true);

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const grant = await tx.staffPrivilegeGrant.update({
        where: { id: grantId },
        data: {
          status: (dto.status as any) ?? undefined,
          effectiveFrom: dto.effectiveFrom !== undefined ? from : undefined,
          effectiveTo: dto.effectiveTo !== undefined ? to : undefined,
          notes: dto.notes === undefined ? undefined : dto.notes,
          targetMeta: dto.targetMeta === undefined ? undefined : dto.targetMeta,
        } as any,
      });

      await this.ctx.audit.log(
        {
          branchId: row.branchId,
          actorUserId: principal.userId,
          action: "STAFF_PRIVILEGE_UPDATE",
          entity: "StaffPrivilegeGrant",
          entityId: grant.id,
          meta: { staffId: row.staffId, changes: dto },
        },
        tx,
      );

      return grant;
    });

    return updated;
  }

  async revokePrivilegeGrant(principal: Principal, grantId: string) {
    const row = await this.ctx.prisma.staffPrivilegeGrant.findUnique({
      where: { id: grantId },
      include: { staff: { include: { assignments: true } } },
    });
    if (!row) throw new NotFoundException("Privilege grant not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!row.staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const now = new Date();

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const grant = await tx.staffPrivilegeGrant.update({
        where: { id: grantId },
        data: { status: "REVOKED" as any, effectiveTo: row.effectiveTo ?? now },
      });

      await this.ctx.audit.log(
        {
          branchId: row.branchId,
          actorUserId: principal.userId,
          action: "STAFF_PRIVILEGE_REVOKE",
          entity: "StaffPrivilegeGrant",
          entityId: grant.id,
          meta: { staffId: row.staffId },
        },
        tx,
      );

      return grant;
    });

    return updated;
  }

  // ---------------- Provider profile hooks ----------------

  async listProviderProfiles(principal: Principal, staffId: string) {
    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const items = await this.ctx.prisma.staffProviderProfile.findMany({
      where: { staffId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        specialty: { select: { id: true, name: true } },
      },
      take: 200,
    });

    return { items };
  }

  async upsertProviderProfile(principal: Principal, staffId: string, dto: UpsertStaffProviderProfileDto) {
    this.assertCanOperateOnBranch(principal, dto.branchId);

    const staff = await this.ctx.prisma.staff.findUnique({ where: { id: staffId }, include: { assignments: true } });
    if (!staff) throw new NotFoundException("Staff not found");

    if (principal.roleScope !== "GLOBAL") {
      const allowed = this.allowedBranchIds(principal);
      if (!staff.assignments.some((a) => allowed.includes(a.branchId))) throw new ForbiddenException("Forbidden");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const row = await tx.staffProviderProfile.upsert({
        where: { staffId_branchId: { staffId, branchId: dto.branchId } } as any,
        create: {
          staffId,
          branchId: dto.branchId,
          isActive: dto.isActive ?? true,
          providerCode: dto.providerCode ?? null,
          displayName: dto.displayName ?? null,
          departmentId: dto.departmentId ?? null,
          specialtyId: dto.specialtyId ?? null,
          consultationModes: dto.consultationModes ?? null,
          schedulingProfile: dto.schedulingProfile ?? null,
          billingProfile: dto.billingProfile ?? null,
          clinicalProfile: dto.clinicalProfile ?? null,
        } as any,
        update: {
          isActive: dto.isActive ?? undefined,
          providerCode: dto.providerCode === undefined ? undefined : dto.providerCode,
          displayName: dto.displayName === undefined ? undefined : dto.displayName,
          departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
          specialtyId: dto.specialtyId === undefined ? undefined : dto.specialtyId,
          consultationModes: dto.consultationModes === undefined ? undefined : dto.consultationModes,
          schedulingProfile: dto.schedulingProfile === undefined ? undefined : dto.schedulingProfile,
          billingProfile: dto.billingProfile === undefined ? undefined : dto.billingProfile,
          clinicalProfile: dto.clinicalProfile === undefined ? undefined : dto.clinicalProfile,
        } as any,
      });

      await this.ctx.audit.log(
        {
          branchId: dto.branchId,
          actorUserId: principal.userId,
          action: "STAFF_PROVIDER_PROFILE_UPSERT",
          entity: "StaffProviderProfile",
          entityId: row.id,
          meta: { staffId, ...dto },
        },
        tx,
      );

      return row;
    });

    return updated;
  }

}
