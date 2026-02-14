import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateDonorDto, UpdateDonorDto, SubmitScreeningDto, DeferDonorDto, RecordConsentDto } from "./dto";

@Injectable()
export class DonorService {
  constructor(private readonly ctx: BBContextService) {}

  async list(principal: Principal, opts: { branchId?: string | null; q?: string; bloodGroup?: string; status?: string; take?: number }) {
    const bid = this.ctx.resolveBranchId(principal, opts.branchId);
    const where: any = { branchId: bid };
    if (opts.bloodGroup) where.bloodGroup = opts.bloodGroup;
    if (opts.status) where.donorStatus = opts.status;
    const query = (opts.q ?? "").trim();
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { donorNumber: { contains: query, mode: "insensitive" } },
        { mobile: { contains: query, mode: "insensitive" } },
      ];
    }
    return this.ctx.prisma.donor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.take ?? 100, 500),
    });
  }

  async get(principal: Principal, id: string) {
    const donor = await this.ctx.prisma.donor.findUnique({
      where: { id },
      include: {
        deferrals: { orderBy: { createdAt: "desc" } },
        screenings: { orderBy: { createdAt: "desc" }, take: 5 },
        bloodUnits: { orderBy: { collectionStartAt: "desc" }, take: 10 },
      },
    });
    if (!donor) throw new NotFoundException("Donor not found");
    this.ctx.resolveBranchId(principal, donor.branchId);
    return donor;
  }

  async create(principal: Principal, dto: CreateDonorDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const donorNumber = `DN-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.ctx.prisma.donor.create({
      data: {
        branchId: bid,
        donorNumber,
        name: dto.name!,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender ?? "UNKNOWN",
        bloodGroup: dto.bloodGroup as any,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        aadhaarNo: dto.aadhaarNo,
        donorType: (dto.donorType as any) ?? "VOLUNTARY",
        donorStatus: "ELIGIBLE",
        patientId: dto.patientId,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_DONOR_CREATE", entity: "Donor", entityId: result.id, meta: { donorNumber },
    });
    return result;
  }

  async update(principal: Principal, id: string, dto: UpdateDonorDto) {
    const existing = await this.ctx.prisma.donor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Donor not found");
    const bid = this.ctx.resolveBranchId(principal, existing.branchId);
    const result = await this.ctx.prisma.donor.update({
      where: { id },
      data: {
        name: dto.name, mobile: dto.mobile,
        email: dto.email, address: dto.address, bloodGroup: dto.bloodGroup as any,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_DONOR_UPDATE", entity: "Donor", entityId: id, meta: { dto },
    });
    return result;
  }

  async submitScreening(principal: Principal, donorId: string, dto: SubmitScreeningDto) {
    const donor = await this.ctx.prisma.donor.findUnique({ where: { id: donorId } });
    if (!donor) throw new NotFoundException("Donor not found");
    const bid = this.ctx.resolveBranchId(principal, donor.branchId);

    // Check active deferrals
    const activeDeferral = await this.ctx.prisma.donorDeferral.findFirst({
      where: { donorId, deferralType: "PERMANENT" },
    });
    if (activeDeferral) throw new BadRequestException("Donor is permanently deferred");

    const tempDeferral = await this.ctx.prisma.donorDeferral.findFirst({
      where: { donorId, deferralType: "TEMPORARY", endDate: { gte: new Date() } },
    });
    if (tempDeferral) throw new BadRequestException(`Donor is temporarily deferred until ${tempDeferral.endDate?.toISOString()}`);

    const result = await this.ctx.prisma.donorScreening.create({
      data: {
        donorId,
        dhqResponses: dto.dhqResponses ?? {},
        hemoglobinGdl: dto.hemoglobinGdl,
        weightKg: dto.weightKg,
        bpSystolic: dto.bpSystolic,
        bpDiastolic: dto.bpDiastolic,
        temperatureC: dto.temperatureC,
        pulseRate: dto.pulseRate,
        eligibilityDecision: dto.eligibilityDecision ?? "ELIGIBLE",
        decisionNotes: dto.decisionNotes,
        decidedByStaffId: principal.userId,
        consentGiven: dto.consentGiven ?? false,
      },
    });

    if (dto.eligibilityDecision === "DEFERRED") {
      await this.ctx.prisma.donor.update({ where: { id: donorId }, data: { donorStatus: "TEMPORARILY_DEFERRED" } });
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_DONOR_SCREENING", entity: "DonorScreening", entityId: result.id, meta: { donorId, eligibilityDecision: dto.eligibilityDecision },
    });
    return result;
  }

  async deferDonor(principal: Principal, donorId: string, dto: DeferDonorDto) {
    const donor = await this.ctx.prisma.donor.findUnique({ where: { id: donorId } });
    if (!donor) throw new NotFoundException("Donor not found");
    const bid = this.ctx.resolveBranchId(principal, donor.branchId);

    const newStatus = dto.deferralType === "PERMANENT" ? "PERMANENTLY_DEFERRED" : "TEMPORARILY_DEFERRED";
    const [deferral] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.donorDeferral.create({
        data: {
          donorId,
          reason: dto.reason!,
          deferralType: dto.deferralType!,
          startDate: new Date(),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          deferredByStaffId: principal.userId,
        },
      }),
      this.ctx.prisma.donor.update({ where: { id: donorId }, data: { donorStatus: newStatus as any } }),
    ]);

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_DONOR_DEFER", entity: "DonorDeferral", entityId: deferral.id, meta: { donorId, reason: dto.reason, type: dto.deferralType },
    });
    return deferral;
  }

  async getDeferrals(principal: Principal, donorId: string) {
    const donor = await this.ctx.prisma.donor.findUnique({ where: { id: donorId } });
    if (!donor) throw new NotFoundException("Donor not found");
    this.ctx.resolveBranchId(principal, donor.branchId);
    return this.ctx.prisma.donorDeferral.findMany({
      where: { donorId },
      orderBy: { createdAt: "desc" },
    });
  }

  async recordConsent(principal: Principal, donorId: string, dto: RecordConsentDto) {
    const donor = await this.ctx.prisma.donor.findUnique({ where: { id: donorId } });
    if (!donor) throw new NotFoundException("Donor not found");
    const bid = this.ctx.resolveBranchId(principal, donor.branchId);

    // Update latest screening with consent
    const latestScreening = await this.ctx.prisma.donorScreening.findFirst({
      where: { donorId },
      orderBy: { createdAt: "desc" },
    });
    if (!latestScreening) throw new BadRequestException("No screening found to record consent for");

    const result = await this.ctx.prisma.donorScreening.update({
      where: { id: latestScreening.id },
      data: { consentGiven: true, consentSignature: dto.signature },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_DONOR_CONSENT", entity: "DonorScreening", entityId: result.id, meta: { donorId },
    });
    return result;
  }
}
