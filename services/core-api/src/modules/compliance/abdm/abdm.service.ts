import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import type {
  CreateAbdmConfigDto,
  UpdateAbdmConfigDto,
  CreateHfrProfileDto,
  UpdateHfrProfileDto,
  CreateHprLinkDto,
  UpdateHprLinkDto,
} from "./dto/abdm.dto";

// Fields required for a complete HFR profile submission
const HFR_REQUIRED_FIELDS = [
  "facilityName",
  "ownershipType",
  "facilityType",
  "systemsOfMedicine",
  "servicesOffered",
  "addressLine1",
  "city",
  "state",
  "pincode",
  "contactPhone",
  "contactEmail",
] as const;

@Injectable()
export class AbdmService {
  constructor(private readonly ctx: ComplianceContextService) {}

  // ──────────────────────────────────────────────────────────────
  // ABDM Config
  // ──────────────────────────────────────────────────────────────

  async getConfig(principal: Principal, workspaceId: string, environment?: "SANDBOX" | "PRODUCTION") {
    if (!workspaceId) throw new BadRequestException("workspaceId is required");

    if (environment) {
      // Use the compound unique key for exact lookup
      const config = await this.ctx.prisma.abdmConfig.findUnique({
        where: { workspaceId_environment: { workspaceId, environment } },
      });
      return config ?? null;
    }

    // No environment specified — return all configs for the workspace
    const configs = await this.ctx.prisma.abdmConfig.findMany({
      where: { workspaceId },
    });

    return configs;
  }

  async upsertConfig(principal: Principal, dto: CreateAbdmConfigDto | (UpdateAbdmConfigDto & { workspaceId?: string }), abdmConfigId?: string) {
    const workspaceId = (dto as any).workspaceId ?? undefined;

    if (!abdmConfigId && !workspaceId) {
      throw new BadRequestException("workspaceId is required for new config");
    }

    // If updating, verify existence
    if (abdmConfigId) {
      const existing = await this.ctx.prisma.abdmConfig.findUnique({ where: { id: abdmConfigId } });
      if (!existing) throw new NotFoundException("ABDM config not found");

      // Maker-checker for secret changes
      if (dto.clientSecretEnc) {
        if (existing.clientSecretEnc && existing.clientSecretEnc !== dto.clientSecretEnc) {
          return this.ctx.requireApproval({
            workspaceId: existing.workspaceId,
            changeType: 'ABDM_SECRET_UPDATE',
            entityType: 'ABDM_CONFIG',
            entityId: abdmConfigId,
            payloadDraft: { clientSecretEnc: dto.clientSecretEnc, environment: existing.environment },
            actorId: principal.staffId!,
          });
        }
      }

      const updated = await this.ctx.prisma.$transaction(async (tx) => {
        const result = await tx.abdmConfig.update({
          where: { id: abdmConfigId },
          data: {
            ...(dto.environment !== undefined && { environment: dto.environment }),
            ...(dto.clientId !== undefined && { clientId: dto.clientId }),
            ...(dto.clientSecretEnc !== undefined && { clientSecretEnc: dto.clientSecretEnc }),
            ...(dto.callbackUrls !== undefined && { callbackUrls: dto.callbackUrls }),
            ...(dto.featureTogglesJson !== undefined && { featureTogglesJson: dto.featureTogglesJson }),
          },
        });

        await this.ctx.logCompliance(
          {
            workspaceId: existing.workspaceId,
            entityType: "ABDM_CONFIG",
            entityId: abdmConfigId,
            action: "UPDATE",
            actorStaffId: principal.staffId,
            before: existing,
            after: result,
          },
          tx,
        );

        await this.ctx.audit.log({
          action: "ABDM_CONFIG_UPDATE",
          actorUserId: principal.userId,
          entity: "AbdmConfig",
          entityId: abdmConfigId,
          meta: { before: existing, after: result },
        });

        return result;
      });

      return updated;
    }

    // Create or update config using compound unique key (workspaceId + environment)
    const createDto = dto as CreateAbdmConfigDto;

    const configData = {
      clientId: createDto.clientId ?? null,
      clientSecretEnc: createDto.clientSecretEnc ?? null,
      callbackUrls: createDto.callbackUrls ?? [],
      featureTogglesJson: createDto.featureTogglesJson ?? {},
    };

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      // Check if a config already exists for this workspace + environment
      const existingForEnv = await tx.abdmConfig.findUnique({
        where: {
          workspaceId_environment: {
            workspaceId: createDto.workspaceId,
            environment: createDto.environment,
          },
        },
      });

      const result = await tx.abdmConfig.upsert({
        where: {
          workspaceId_environment: {
            workspaceId: createDto.workspaceId,
            environment: createDto.environment,
          },
        },
        create: {
          workspaceId: createDto.workspaceId,
          environment: createDto.environment,
          ...configData,
        },
        update: configData,
      });

      const action = existingForEnv ? "UPDATE" : "CREATE";

      await this.ctx.logCompliance(
        {
          workspaceId: createDto.workspaceId,
          entityType: "ABDM_CONFIG",
          entityId: result.id,
          action,
          actorStaffId: principal.staffId,
          ...(existingForEnv ? { before: existingForEnv } : {}),
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log({
        action: existingForEnv ? "ABDM_CONFIG_UPDATE" : "ABDM_CONFIG_CREATE",
        actorUserId: principal.userId,
        entity: "AbdmConfig",
        entityId: result.id,
        meta: { ...(existingForEnv ? { before: existingForEnv } : {}), after: result },
      });

      return result;
    });

    return created;
  }

  async testConfig(configId: string, actorId: string) {
    const config = await this.ctx.prisma.abdmConfig.findUnique({ where: { id: configId } });
    if (!config) throw new NotFoundException("ABDM config not found");

    const testedAt = new Date();

    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.abdmConfig.update({
        where: { id: configId },
        data: { status: "TESTED", lastTestedAt: testedAt },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: config.workspaceId,
          entityType: "ABDM_CONFIG",
          entityId: configId,
          action: "TEST",
          actorStaffId: actorId,
          before: { status: config.status },
          after: { status: "TESTED", lastTestedAt: testedAt },
        },
        tx,
      );
    });

    return { success: true, testedAt };
  }

  // ──────────────────────────────────────────────────────────────
  // HFR Profile
  // ──────────────────────────────────────────────────────────────

  async getHfrProfile(principal: Principal, workspaceId: string) {
    if (!workspaceId) throw new BadRequestException("workspaceId is required");

    const profile = await this.ctx.prisma.hfrFacilityProfile.findFirst({
      where: { workspaceId },
    });

    return profile ?? null;
  }

  async upsertHfrProfile(principal: Principal, dto: CreateHfrProfileDto | (UpdateHfrProfileDto & { workspaceId?: string }), hfrProfileId?: string) {
    // Update existing profile
    if (hfrProfileId) {
      const existing = await this.ctx.prisma.hfrFacilityProfile.findUnique({ where: { id: hfrProfileId } });
      if (!existing) throw new NotFoundException("HFR profile not found");

      const updateDto = dto as UpdateHfrProfileDto;

      const updated = await this.ctx.prisma.$transaction(async (tx) => {
        const result = await tx.hfrFacilityProfile.update({
          where: { id: hfrProfileId },
          data: {
            ...(updateDto.facilityName !== undefined && { facilityName: updateDto.facilityName }),
            ...(updateDto.ownershipType !== undefined && { ownershipType: updateDto.ownershipType }),
            ...(updateDto.facilityType !== undefined && { facilityType: updateDto.facilityType }),
            ...(updateDto.systemsOfMedicine !== undefined && { systemsOfMedicine: updateDto.systemsOfMedicine }),
            ...(updateDto.servicesOffered !== undefined && { servicesOffered: updateDto.servicesOffered }),
            ...(updateDto.addressLine1 !== undefined && { addressLine1: updateDto.addressLine1 }),
            ...(updateDto.addressLine2 !== undefined && { addressLine2: updateDto.addressLine2 }),
            ...(updateDto.city !== undefined && { city: updateDto.city }),

            ...(updateDto.state !== undefined && { state: updateDto.state }),
            ...(updateDto.pincode !== undefined && { pincode: updateDto.pincode }),
            ...(updateDto.latitude !== undefined && { latitude: updateDto.latitude }),
            ...(updateDto.longitude !== undefined && { longitude: updateDto.longitude }),
            ...(updateDto.contactPhone !== undefined && { contactPhone: updateDto.contactPhone }),
            ...(updateDto.contactEmail !== undefined && { contactEmail: updateDto.contactEmail }),

          },
        });

        await this.ctx.logCompliance(
          {
            workspaceId: existing.workspaceId,
            entityType: "HFR_PROFILE",
            entityId: hfrProfileId,
            action: "UPDATE",
            actorStaffId: principal.staffId,
            before: existing,
            after: result,
          },
          tx,
        );

        await this.ctx.audit.log({
          action: "ABDM_HFR_UPDATE",
          actorUserId: principal.userId,
          entity: "AbdmHfrProfile",
          entityId: hfrProfileId,
          meta: { before: existing, after: result },
        });

        return result;
      });

      return updated;
    }

    // Create new profile
    const createDto = dto as CreateHfrProfileDto;

    const existingForWs = await this.ctx.prisma.hfrFacilityProfile.findFirst({
      where: { workspaceId: createDto.workspaceId },
    });
    if (existingForWs) {
      throw new BadRequestException("HFR profile already exists for this workspace. Use PATCH to update.");
    }

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.hfrFacilityProfile.create({
        data: {
          workspaceId: createDto.workspaceId,
          facilityName: createDto.facilityName,
          ownershipType: createDto.ownershipType,
          facilityType: createDto.facilityType,
          systemsOfMedicine: createDto.systemsOfMedicine,
          servicesOffered: createDto.servicesOffered,
          addressLine1: createDto.addressLine1,
          addressLine2: createDto.addressLine2 ?? null,
          city: createDto.city,

          state: createDto.state,
          pincode: createDto.pincode,
          latitude: createDto.latitude ?? null,
          longitude: createDto.longitude ?? null,
          contactPhone: createDto.contactPhone ?? null,
          contactEmail: createDto.contactEmail ?? null,

        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: createDto.workspaceId,
          entityType: "HFR_PROFILE",
          entityId: result.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log({
        action: "ABDM_HFR_CREATE",
        actorUserId: principal.userId,
        entity: "AbdmHfrProfile",
        entityId: result.id,
        meta: { after: result },
      });

      return result;
    });

    return created;
  }

  async validateHfrProfile(principal: Principal, hfrProfileIdOrWorkspaceId: string, byProfileId = false) {
    const profile = byProfileId
      ? await this.ctx.prisma.hfrFacilityProfile.findUnique({ where: { id: hfrProfileIdOrWorkspaceId } })
      : await this.ctx.prisma.hfrFacilityProfile.findFirst({ where: { workspaceId: hfrProfileIdOrWorkspaceId } });

    if (!profile) {
      return {
        complete: false,
        completenessScore: 0,
        missingFields: [...HFR_REQUIRED_FIELDS],
        message: "No HFR profile found for this workspace.",
      };
    }

    const profileData = profile as Record<string, any>;
    const missingFields: string[] = [];

    for (const field of HFR_REQUIRED_FIELDS) {
      const value = profileData[field];
      if (value === null || value === undefined || value === "") {
        missingFields.push(field);
      } else if (Array.isArray(value) && value.length === 0) {
        missingFields.push(field);
      }
    }

    const totalFields = HFR_REQUIRED_FIELDS.length;
    const filledFields = totalFields - missingFields.length;
    const completenessScore = Math.round((filledFields / totalFields) * 100);

    return {
      complete: missingFields.length === 0,
      completenessScore,
      missingFields,
      message: missingFields.length === 0
        ? "HFR profile is complete and ready for submission."
        : `${missingFields.length} required field(s) missing.`,
    };
  }

  async updateHfrStatus(
    profileId: string,
    status: string,
    notes: string | undefined,
    actorId: string,
  ) {
    const existing = await this.ctx.prisma.hfrFacilityProfile.findUnique({ where: { id: profileId } });
    if (!existing) throw new NotFoundException("HFR profile not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.hfrFacilityProfile.update({
        where: { id: profileId },
        data: {
          verificationStatus: status as any,
          ...(notes !== undefined && { verificationNotes: notes }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "HFR_PROFILE",
          entityId: profileId,
          action: "STATUS_UPDATE",
          actorStaffId: actorId,
          before: { verificationStatus: (existing as any).verificationStatus },
          after: { verificationStatus: status },
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  // ──────────────────────────────────────────────────────────────
  // HPR Links
  // ──────────────────────────────────────────────────────────────

  async getHprSummary(workspaceId: string) {
    const [total, verified] = await Promise.all([
      this.ctx.prisma.hprProfessionalLink.count({ where: { workspaceId } }),
      this.ctx.prisma.hprProfessionalLink.count({
        where: { workspaceId, registrationStatus: "VERIFIED" },
      }),
    ]);

    return { total, verified, unverified: total - verified };
  }

  async listHprLinks(
    principal: Principal,
    query: {
      workspaceId?: string;
      staffId?: string;
      status?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.staffId) where.staffId = query.staffId;
    if (query.status) where.registrationStatus = query.status;

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.hprProfessionalLink.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async createHprLink(principal: Principal, dto: CreateHprLinkDto) {
    // Duplicate check: same workspace + staffId + hprId
    const existing = await this.ctx.prisma.hprProfessionalLink.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        staffId: dto.staffId,
        hprId: dto.hprId,
      },
    });
    if (existing) {
      throw new BadRequestException("HPR link already exists for this staff member with the same HPR ID");
    }

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.hprProfessionalLink.create({
        data: {
          workspaceId: dto.workspaceId,
          staffId: dto.staffId,
          hprId: dto.hprId,
          category: dto.category,
          registrationStatus: "UNVERIFIED",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.workspaceId,
          entityType: "HPR_LINK",
          entityId: result.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: { staffId: dto.staffId, hprId: dto.hprId, category: dto.category },
        },
        tx,
      );

      await this.ctx.audit.log({
        action: "ABDM_HPR_LINK_CREATE",
        actorUserId: principal.userId,
        entity: "AbdmHprLink",
        entityId: result.id,
        meta: { after: result },
      });

      return result;
    });

    return created;
  }

  async bulkImportHpr(
    principal: Principal,
    dto: { workspaceId: string; links: Array<{ staffId: string; hprId: string; category: string }> },
  ) {
    const results: { hprId: string; status: string; id?: string; error?: string }[] = [];

    for (const link of dto.links) {
      try {
        const created = await this.ctx.prisma.hprProfessionalLink.create({
          data: {
            workspaceId: dto.workspaceId,
            staffId: link.staffId,
            hprId: link.hprId,
            category: link.category,
            registrationStatus: "UNVERIFIED",
          },
        });

        await this.ctx.logCompliance({
          workspaceId: dto.workspaceId,
          entityType: "HPR_LINK",
          entityId: created.id,
          action: "BULK_IMPORT",
          actorStaffId: principal.staffId,
          after: created,
        });

        results.push({ hprId: link.hprId, status: "created", id: created.id });
      } catch (e: any) {
        results.push({ hprId: link.hprId, status: "error", error: e.message });
      }
    }

    return {
      imported: results.filter((r) => r.status === "created").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  }

  async updateHprLink(principal: Principal, hprLinkId: string, dto: UpdateHprLinkDto) {
    const existing = await this.ctx.prisma.hprProfessionalLink.findUnique({ where: { id: hprLinkId } });
    if (!existing) throw new NotFoundException("HPR link not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.hprProfessionalLink.update({
        where: { id: hprLinkId },
        data: {
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.registrationStatus !== undefined && { registrationStatus: dto.registrationStatus }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "HPR_LINK",
          entityId: hprLinkId,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log({
        action: "ABDM_HPR_LINK_UPDATE",
        actorUserId: principal.userId,
        entity: "AbdmHprLink",
        entityId: hprLinkId,
        meta: { before: existing, after: result },
      });

      return result;
    });

    return updated;
  }

  async verifyHprLink(principal: Principal, hprLinkId: string) {
    const existing = await this.ctx.prisma.hprProfessionalLink.findUnique({ where: { id: hprLinkId } });
    if (!existing) throw new NotFoundException("HPR link not found");

    if (existing.registrationStatus === "VERIFIED") {
      throw new BadRequestException("HPR link is already verified");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.hprProfessionalLink.update({
        where: { id: hprLinkId },
        data: {
          registrationStatus: "VERIFIED",
          verifiedAt: new Date(),
          verifiedByStaffId: principal.staffId ?? null,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "HPR_LINK",
          entityId: hprLinkId,
          action: "VERIFY",
          actorStaffId: principal.staffId,
          before: { registrationStatus: existing.registrationStatus },
          after: { registrationStatus: "VERIFIED" },
        },
        tx,
      );

      await this.ctx.audit.log({
        action: "ABDM_HPR_LINK_VERIFY",
        actorUserId: principal.userId,
        entity: "AbdmHprLink",
        entityId: hprLinkId,
        meta: { before: { registrationStatus: existing.registrationStatus }, after: { registrationStatus: "VERIFIED" } },
      });

      return result;
    });

    return updated;
  }
}
