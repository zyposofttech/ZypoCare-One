import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import type {
  AbdmEnvironment,
  CreateAbdmConfigDto,
  UpdateAbdmConfigDto,
  CreateHfrProfileDto,
  UpdateHfrProfileDto,
  CreateHprLinkDto,
  UpdateHprLinkDto,
  BulkImportHprDto,
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

function parseCallbackUrls(text?: string): string[] | undefined {
  const raw = (text ?? "").trim();
  if (!raw) return undefined;
  return raw
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeCallbackUrls(dto: any): string[] | undefined {
  if (Array.isArray(dto.callbackUrls)) {
    const arr = dto.callbackUrls.map((s: any) => String(s).trim()).filter(Boolean);
    return arr;
  }
  if (typeof dto.callbackUrlsText === "string") return parseCallbackUrls(dto.callbackUrlsText);
  // allow legacy "callbackUrls" as a single string too
  if (typeof dto.callbackUrls === "string") return parseCallbackUrls(dto.callbackUrls);
  return undefined;
}

function buildFeatureTogglesFromLegacy(dto: any): any | undefined {
  const hasAny =
    dto.enableAbhaLinking !== undefined ||
    dto.enableConsentFlow !== undefined ||
    dto.enableHealthRecords !== undefined;

  if (!hasAny) return undefined;

  const enableAbha = Boolean(dto.enableAbhaLinking);
  const enableConsent = Boolean(dto.enableConsentFlow);
  const enableRecords = Boolean(dto.enableHealthRecords);

  return {
    abhaCreation: enableAbha,
    abhaLinking: enableAbha,
    scanAndShare: enableAbha,
    consentManagement: enableConsent,
    healthRecordSharing: enableRecords,
  };
}

function pickSecret(dto: any): string | undefined {
  const candidate = dto.clientSecretEnc ?? dto.clientSecret;
  if (candidate === undefined) return undefined;

  const s = String(candidate).trim();
  if (!s) return undefined;
  if (s === "[REDACTED]") return undefined;

  return s;
}

function deriveToggles(featureTogglesJson: any) {
  const t = featureTogglesJson ?? {};
  const enableAbhaLinking = Boolean(
    t.abhaLinking ?? t.abhaCreation ?? t.scanAndShare ?? t.linking ?? false,
  );
  const enableConsentFlow = Boolean(
    t.consentManagement ?? t.enableConsentFlow ?? t.consent_flow ?? false,
  );
  const enableHealthRecords = Boolean(
    t.healthRecordSharing ?? t.enableHealthRecords ?? t.health_records ?? false,
  );

  return { enableAbhaLinking, enableConsentFlow, enableHealthRecords };
}

function redactConfigForAudit(config: any) {
  if (!config) return config;
  return {
    ...config,
    clientSecretEnc: config.clientSecretEnc ? "[REDACTED]" : null,
  };
}

@Injectable()
export class AbdmService {
  constructor(private readonly ctx: ComplianceContextService) { }

  // ──────────────────────────────────────────────────────────────
  // UI Adapter (Response Shape)
  // ──────────────────────────────────────────────────────────────

  private toUiConfig(config: any) {
    if (!config) return null;

    const callbackUrls = Array.isArray(config.callbackUrls) ? config.callbackUrls : [];
    const callbackUrlsText = callbackUrls.length ? callbackUrls.join("\n") : "";

    const toggles = deriveToggles(config.featureTogglesJson);

    const hasClientSecret = Boolean(config.clientSecretEnc);
    return {
      ...config,

      // never return the stored secret
      clientSecretEnc: null,
      clientSecret: hasClientSecret ? "[REDACTED]" : "",

      hasClientSecret,
      callbackUrlsText,

      // FE-friendly booleans
      ...toggles,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // ABDM Config (ABHA)
  // ──────────────────────────────────────────────────────────────

  async getConfig(
    principal: Principal,
    workspaceId: string,
    environment?: AbdmEnvironment,
  ) {
    if (!workspaceId) throw new BadRequestException("workspaceId is required");

    const config = await this.ctx.prisma.abdmConfig.findFirst({
      where: {
        workspaceId,
        ...(environment ? { environment: environment as any } : {}),
      },
    });

    return this.toUiConfig(config ?? null);
  }

  async upsertConfig(
    principal: Principal,
    dto: CreateAbdmConfigDto | (UpdateAbdmConfigDto & { workspaceId?: string }),
    abdmConfigId?: string,
  ) {
    const workspaceId = (dto as any).workspaceId ?? undefined;

    if (!abdmConfigId && !workspaceId) {
      throw new BadRequestException("workspaceId is required for new config");
    }

    const normalizedCallbackUrls = normalizeCallbackUrls(dto as any);
    const derivedToggles =
      (dto as any).featureTogglesJson !== undefined
        ? (dto as any).featureTogglesJson
        : buildFeatureTogglesFromLegacy(dto as any);
    const secret = pickSecret(dto as any);

    // ── Update existing by ID ────────────────────────────────────
    if (abdmConfigId) {
      const existing = await this.ctx.prisma.abdmConfig.findUnique({ where: { id: abdmConfigId } });
      if (!existing) throw new NotFoundException("ABDM config not found");

      // ── Maker-checker for secret changes ──────────────────────────────
      if (secret !== undefined) {
        // Only trigger approval if secret is actually changing and a secret already exists
        const isSecretChanging =
          Boolean(existing.clientSecretEnc) && existing.clientSecretEnc !== secret;

        if (isSecretChanging) {
          if (!principal.staffId) {
            throw new BadRequestException("Staff context required for secret update approvals");
          }

          const approval = await this.ctx.prisma.$transaction(async (tx) => {
            const created = await tx.complianceApproval.create({
              data: {
                workspaceId: existing.workspaceId,
                changeType: "ABDM_SECRET_UPDATE",
                entityType: "ABDM_CONFIG" as any,
                entityId: existing.id,
                status: "DRAFT",
                requestedByStaffId: principal.staffId!,
                payloadDraft: {
                  // ✅ store the real secret under clientSecretEnc
                  clientSecretEnc: secret,
                },
              },
            });

            await this.ctx.logCompliance(
              {
                workspaceId: existing.workspaceId,
                entityType: "APPROVAL",
                entityId: created.id,
                action: "CREATE",
                actorStaffId: principal.staffId,
                after: {
                  changeType: "ABDM_SECRET_UPDATE",
                  entityType: "ABDM_CONFIG",
                  entityId: existing.id,
                },
              },
              tx,
            );

            return created;
          });

          return {
            requiresApproval: true,
            approvalId: approval.id,
            status: approval.status,
          };
        }
      }




      const updated = await this.ctx.prisma.$transaction(async (tx) => {
        const result = await tx.abdmConfig.update({
          where: { id: abdmConfigId },
          data: {
            ...(dto.environment !== undefined && { environment: dto.environment as any }),
            ...(dto.clientId !== undefined && { clientId: dto.clientId }),
            ...(secret !== undefined && { clientSecretEnc: secret }),
            ...(normalizedCallbackUrls !== undefined && { callbackUrls: normalizedCallbackUrls }),
            ...(derivedToggles !== undefined && { featureTogglesJson: derivedToggles }),
          },
        });

        await this.ctx.logCompliance(
          {
            workspaceId: existing.workspaceId,
            entityType: "ABDM_CONFIG",
            entityId: abdmConfigId,
            action: "UPDATE",
            actorStaffId: principal.staffId,
            before: redactConfigForAudit(existing),
            after: redactConfigForAudit(result),
          },
          tx,
        );

        await this.ctx.audit.log(
          {
            action: "ABDM_CONFIG_UPDATE",
            actorUserId: principal.userId,
            entity: "AbdmConfig",
            entityId: abdmConfigId,
            meta: { before: redactConfigForAudit(existing), after: redactConfigForAudit(result) },
          },
          tx,
        );

        return result;
      });

      return this.toUiConfig(updated);
    }

    // ── Create new config (workspaceId unique in current schema) ──
    const createDto = dto as CreateAbdmConfigDto;

    const existingForWs = await this.ctx.prisma.abdmConfig.findFirst({
      where: { workspaceId: createDto.workspaceId },
    });
    if (existingForWs) {
      throw new BadRequestException("ABDM config already exists for this workspace. Use PATCH to update.");
    }

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.abdmConfig.create({
        data: {
          workspaceId: createDto.workspaceId,
          environment: createDto.environment as any,
          clientId: createDto.clientId ?? null,
          clientSecretEnc: secret ?? null,
          callbackUrls: normalizedCallbackUrls ?? [],
          featureTogglesJson: derivedToggles ?? createDto.featureTogglesJson ?? {},
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: createDto.workspaceId,
          entityType: "ABDM_CONFIG",
          entityId: result.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: redactConfigForAudit(result),
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          action: "ABDM_CONFIG_CREATE",
          actorUserId: principal.userId,
          entity: "AbdmConfig",
          entityId: result.id,
          meta: { after: redactConfigForAudit(result) },
        },
        tx,
      );

      return result;
    });

    return this.toUiConfig(created);
  }

  async testConfig(principal: Principal, configId: string) {
    const config = await this.ctx.prisma.abdmConfig.findUnique({ where: { id: configId } });
    if (!config) throw new NotFoundException("ABDM config not found");

    const testedAt = new Date();

    await this.ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.abdmConfig.update({
        where: { id: configId },
        data: { status: "TESTED", lastTestedAt: testedAt },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: config.workspaceId,
          entityType: "ABDM_CONFIG",
          entityId: configId,
          action: "TEST",
          actorStaffId: principal.staffId,
          before: { status: config.status },
          after: { status: "TESTED", lastTestedAt: testedAt },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          actorUserId: principal.userId,
          action: "ABDM_CONFIG_TEST",
          entity: "AbdmConfig",
          entityId: configId,
          meta: { environment: config.environment, testedAt },
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

  async upsertHfrProfile(
    principal: Principal,
    dto: CreateHfrProfileDto | (UpdateHfrProfileDto & { workspaceId?: string }),
    hfrProfileId?: string,
  ) {
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

        await this.ctx.audit.log(
          {
            action: "ABDM_HFR_UPDATE",
            actorUserId: principal.userId,
            entity: "HfrFacilityProfile",
            entityId: hfrProfileId,
            meta: { before: existing, after: result },
          },
          tx,
        );

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

      await this.ctx.audit.log(
        {
          action: "ABDM_HFR_CREATE",
          actorUserId: principal.userId,
          entity: "HfrFacilityProfile",
          entityId: result.id,
          meta: { after: result },
        },
        tx,
      );

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
      message:
        missingFields.length === 0
          ? "HFR profile is complete and ready for submission."
          : `${missingFields.length} required field(s) missing.`,
    };
  }

  async updateHfrStatus(profileId: string, status: string, notes: string | undefined, principal: Principal) {
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
          actorStaffId: principal.staffId,
          before: { verificationStatus: (existing as any).verificationStatus },
          after: { verificationStatus: status },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          actorUserId: principal.userId,
          action: "ABDM_HFR_STATUS_UPDATE",
          entity: "HfrFacilityProfile",
          entityId: profileId,
          meta: { previousStatus: (existing as any).verificationStatus, newStatus: status, notes },
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
    query: { workspaceId?: string; staffId?: string; status?: string; cursor?: string; take?: number },
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

  async bulkImportHpr(principal: Principal, dto: BulkImportHprDto) {
    if (!dto.workspaceId) throw new BadRequestException("workspaceId is required");
    const links = dto.links ?? [];
    if (!Array.isArray(links) || links.length === 0) {
      throw new BadRequestException("links[] is required");
    }

    const results: { hprId: string; status: "created" | "skipped" | "error"; id?: string; error?: string }[] = [];

    for (const link of links) {
      try {
        if (!link?.staffId || !link?.hprId || !link?.category) {
          results.push({ hprId: link?.hprId ?? "", status: "error", error: "Missing staffId/hprId/category" });
          continue;
        }

        const exists = await this.ctx.prisma.hprProfessionalLink.findFirst({
          where: { workspaceId: dto.workspaceId, staffId: link.staffId, hprId: link.hprId },
        });
        if (exists) {
          results.push({ hprId: link.hprId, status: "skipped", id: exists.id });
          continue;
        }

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
          after: { staffId: link.staffId, hprId: link.hprId, category: link.category },
        });

        results.push({ hprId: link.hprId, status: "created", id: created.id });
      } catch (e: any) {
        results.push({ hprId: link?.hprId ?? "", status: "error", error: e.message });
      }
    }

    return {
      imported: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  }

  async createHprLink(principal: Principal, dto: CreateHprLinkDto) {
    const existing = await this.ctx.prisma.hprProfessionalLink.findFirst({
      where: { workspaceId: dto.workspaceId, staffId: dto.staffId, hprId: dto.hprId },
    });
    if (existing) throw new BadRequestException("HPR link already exists for this staff member with the same HPR ID");

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

      await this.ctx.audit.log(
        {
          action: "ABDM_HPR_LINK_CREATE",
          actorUserId: principal.userId,
          entity: "HprProfessionalLink",
          entityId: result.id,
          meta: { after: result },
        },
        tx,
      );

      return result;
    });

    return created;
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
          ...(dto.registrationStatus !== undefined && { registrationStatus: dto.registrationStatus as any }),
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

      await this.ctx.audit.log(
        {
          action: "ABDM_HPR_LINK_UPDATE",
          actorUserId: principal.userId,
          entity: "HprProfessionalLink",
          entityId: hprLinkId,
          meta: { before: existing, after: result },
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async verifyHprLink(principal: Principal, hprLinkId: string) {
    const existing = await this.ctx.prisma.hprProfessionalLink.findUnique({ where: { id: hprLinkId } });
    if (!existing) throw new NotFoundException("HPR link not found");
    if (existing.registrationStatus === "VERIFIED") throw new BadRequestException("HPR link is already verified");

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

      await this.ctx.audit.log(
        {
          action: "ABDM_HPR_LINK_VERIFY",
          actorUserId: principal.userId,
          entity: "HprProfessionalLink",
          entityId: hprLinkId,
          meta: { before: { registrationStatus: existing.registrationStatus }, after: { registrationStatus: "VERIFIED" } },
        },
        tx,
      );

      return result;
    });

    return updated;
  }
}
