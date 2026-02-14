import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type {
  IssueBloodDto, BedsideVerifyDto, StartTransfusionDto,
  RecordVitalsDto, EndTransfusionDto, ReportReactionDto,
  ReturnUnitDto, ActivateMTPDto,
} from "./dto";

@Injectable()
export class IssueService {
  constructor(private readonly ctx: BBContextService) {}

  async issueBlood(principal: Principal, dto: IssueBloodDto) {
    const crossMatch = await this.ctx.prisma.crossMatchTest.findUnique({
      where: { id: dto.crossMatchId },
      include: { bloodUnit: true, request: true },
    });
    if (!crossMatch) throw new NotFoundException("Cross-match not found");
    const bid = this.ctx.resolveBranchId(principal, crossMatch.request.branchId);

    // Safety: Block issue if cross-match expired (>72hr)
    const hoursElapsed = (Date.now() - crossMatch.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > 72) throw new BadRequestException("Cross-match has expired (>72 hours). Re-cross-match required.");

    // Safety: Block issue if cross-match incompatible
    if (crossMatch.result !== "COMPATIBLE") throw new BadRequestException("Cross-match result is not compatible");

    const issueNumber = `BI-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.ctx.prisma.bloodIssue.create({
      data: {
        branchId: bid,
        issueNumber,
        bloodUnitId: crossMatch.bloodUnitId,
        requestId: crossMatch.requestId,
        crossMatchId: dto.crossMatchId!,
        issuedToPerson: dto.issuedTo!,
        issuedToWard: dto.issuedToWard,
        transportBoxTemp: dto.transportTemp,
        issuedByStaffId: principal.userId,
      },
    });

    await this.ctx.prisma.bloodUnit.update({ where: { id: crossMatch.bloodUnitId }, data: { status: "ISSUED" } });
    await this.ctx.prisma.bloodRequest.update({ where: { id: crossMatch.requestId }, data: { status: "ISSUED" } });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_BLOOD_ISSUED", entity: "BloodIssue", entityId: result.id,
      meta: { unitId: crossMatch.bloodUnitId, requestId: crossMatch.requestId, issuedTo: dto.issuedTo },
    });
    return result;
  }

  async bedsideVerify(principal: Principal, issueId: string, dto: BedsideVerifyDto) {
    const issue = await this.ctx.prisma.bloodIssue.findUnique({
      where: { id: issueId },
      include: { bloodUnit: true, request: { include: { patient: true } } },
    });
    if (!issue) throw new NotFoundException("Issue record not found");
    const bid = this.ctx.resolveBranchId(principal, issue.branchId);

    // Safety: Block bedside mismatch
    if (dto.scannedPatientId && dto.scannedPatientId !== issue.request.patientId) {
      throw new BadRequestException("Patient ID mismatch! Scanned patient does not match request patient.");
    }
    if (dto.scannedUnitBarcode && dto.scannedUnitBarcode !== issue.bloodUnit.barcode) {
      throw new BadRequestException("Unit barcode mismatch! Scanned unit does not match issued unit.");
    }

    const result = await this.ctx.prisma.transfusionRecord.upsert({
      where: { issueId },
      create: {
        branchId: bid,
        issueId,
        patientId: issue.request.patientId,
        bedsideVerifier1StaffId: principal.userId,
        bedsideVerifiedAt: new Date(),
        patientWristbandScan: !!dto.scannedPatientId,
        unitBarcodeScan: !!dto.scannedUnitBarcode,
        bedsideVerificationOk: true,
      },
      update: {
        bedsideVerifier1StaffId: principal.userId,
        bedsideVerifiedAt: new Date(),
        patientWristbandScan: !!dto.scannedPatientId,
        unitBarcodeScan: !!dto.scannedUnitBarcode,
        bedsideVerificationOk: true,
      },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_BEDSIDE_VERIFIED", entity: "BloodIssue", entityId: issueId,
      meta: { scannedPatientId: dto.scannedPatientId, scannedUnitBarcode: dto.scannedUnitBarcode },
    });
    return result;
  }

  async startTransfusion(principal: Principal, issueId: string, dto: StartTransfusionDto) {
    const issue = await this.ctx.prisma.bloodIssue.findUnique({
      where: { id: issueId },
      include: { request: true },
    });
    if (!issue) throw new NotFoundException("Issue record not found");
    const bid = this.ctx.resolveBranchId(principal, issue.branchId);

    // Check bedside verification was completed via TransfusionRecord
    const existingRecord = await this.ctx.prisma.transfusionRecord.findUnique({ where: { issueId } });
    if (!existingRecord?.bedsideVerifiedAt) throw new BadRequestException("Bedside verification not completed");

    const result = await this.ctx.prisma.transfusionRecord.update({
      where: { issueId },
      data: {
        startedAt: new Date(),
        preVitals: dto.vitals ?? {},
        administeredByStaffId: principal.userId,
      },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_TRANSFUSION_STARTED", entity: "TransfusionRecord", entityId: result.id,
      meta: { issueId, bloodUnitId: issue.bloodUnitId },
    });
    return result;
  }

  async recordVitals(principal: Principal, issueId: string, dto: RecordVitalsDto) {
    const transfusion = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
    if (!transfusion) throw new NotFoundException("Transfusion record not found");
    const bid = this.ctx.resolveBranchId(principal, transfusion.branchId);

    const vitalsData: Record<string, unknown> = {};
    if (dto.interval === "15min") vitalsData.vitals15Min = { ...dto.vitals, recordedAt: new Date(), recordedBy: principal.userId };
    else if (dto.interval === "30min") vitalsData.vitals30Min = { ...dto.vitals, recordedAt: new Date(), recordedBy: principal.userId };
    else if (dto.interval === "1hr") vitalsData.vitals1Hr = { ...dto.vitals, recordedAt: new Date(), recordedBy: principal.userId };

    if (dto.volumeTransfused) vitalsData.totalVolumeMl = dto.volumeTransfused;

    const result = await this.ctx.prisma.transfusionRecord.update({
      where: { id: transfusion.id },
      data: vitalsData,
    });
    return result;
  }

  async endTransfusion(principal: Principal, issueId: string, dto: EndTransfusionDto) {
    const transfusion = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
    if (!transfusion) throw new NotFoundException("Transfusion record not found");
    const bid = this.ctx.resolveBranchId(principal, transfusion.branchId);

    const result = await this.ctx.prisma.transfusionRecord.update({
      where: { id: transfusion.id },
      data: {
        endedAt: new Date(),
        postVitals: dto.vitals ?? {},
        totalVolumeMl: dto.volumeTransfused,
        hasReaction: dto.hasReaction ?? false,
      },
    });

    const issue = await this.ctx.prisma.bloodIssue.findUnique({ where: { id: issueId } });
    if (issue) {
      await this.ctx.prisma.bloodUnit.update({ where: { id: issue.bloodUnitId }, data: { status: "TRANSFUSED" } });
    }
    await this.ctx.prisma.bloodRequest.updateMany({
      where: { id: (await this.ctx.prisma.bloodIssue.findUnique({ where: { id: issueId } }))?.requestId ?? "" },
      data: { status: "COMPLETED" },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_TRANSFUSION_ENDED", entity: "TransfusionRecord", entityId: transfusion.id,
      meta: { volumeTransfused: dto.volumeTransfused, hasReaction: dto.hasReaction },
    });
    return result;
  }

  async reportReaction(principal: Principal, issueId: string, dto: ReportReactionDto) {
    const transfusion = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
    if (!transfusion) throw new NotFoundException("Transfusion record not found");
    const bid = this.ctx.resolveBranchId(principal, transfusion.branchId);

    const result = await this.ctx.prisma.transfusionReaction.create({
      data: {
        transfusionId: transfusion.id,
        reactionType: dto.reactionType as any,
        severity: dto.severity ?? "UNKNOWN",
        description: dto.description,
        onsetAt: dto.onsetTime ? new Date(dto.onsetTime) : new Date(),
        managementNotes: dto.managementNotes,
        investigationResults: dto.investigationResults,
        reportedByStaffId: principal.userId,
      },
    });

    await this.ctx.prisma.transfusionRecord.update({
      where: { id: transfusion.id },
      data: { hasReaction: true },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_REACTION_REPORTED", entity: "TransfusionReaction", entityId: result.id,
      meta: { transfusionId: transfusion.id, reactionType: dto.reactionType, severity: dto.severity },
    });
    return result;
  }

  async returnUnit(principal: Principal, issueId: string, dto: ReturnUnitDto) {
    const issue = await this.ctx.prisma.bloodIssue.findUnique({ where: { id: issueId }, include: { bloodUnit: true } });
    if (!issue) throw new NotFoundException("Issue record not found");
    const bid = this.ctx.resolveBranchId(principal, issue.branchId);

    // Check return timeout (4 hours)
    const hoursSinceIssue = (Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceIssue > 4) {
      throw new BadRequestException("Return timeout exceeded (>4 hours). Unit must be discarded.");
    }

    await this.ctx.prisma.bloodUnit.update({ where: { id: issue.bloodUnitId }, data: { status: "RETURNED" } });
    const result = await this.ctx.prisma.bloodIssue.update({
      where: { id: issueId },
      data: { isReturned: true, returnedAt: new Date(), returnReason: dto.reason },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_UNIT_RETURNED", entity: "BloodIssue", entityId: issueId,
      meta: { reason: dto.reason, unitId: issue.bloodUnitId },
    });
    return result;
  }

  async activateMTP(principal: Principal, dto: ActivateMTPDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.mTPSession.create({
      data: {
        branchId: bid,
        patientId: dto.patientId!,
        encounterId: dto.encounterId,
        activatedByStaffId: principal.userId,
        activatedAt: new Date(),
        status: "ACTIVE",
      },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_MTP_ACTIVATED", entity: "MTPSession", entityId: result.id,
      meta: { patientId: dto.patientId },
    });
    return result;
  }

  async deactivateMTP(principal: Principal, id: string) {
    const mtp = await this.ctx.prisma.mTPSession.findUnique({ where: { id } });
    if (!mtp) throw new NotFoundException("MTP session not found");
    const bid = this.ctx.resolveBranchId(principal, mtp.branchId);

    const result = await this.ctx.prisma.mTPSession.update({
      where: { id },
      data: { status: "DEACTIVATED", deactivatedAt: new Date(), deactivatedByStaffId: principal.userId },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_MTP_DEACTIVATED", entity: "MTPSession", entityId: id, meta: {},
    });
    return result;
  }

  async getMTP(principal: Principal, id: string) {
    const mtp = await this.ctx.prisma.mTPSession.findUnique({
      where: { id },
      include: { patient: { select: { id: true, name: true, uhid: true } } },
    });
    if (!mtp) throw new NotFoundException("MTP session not found");
    this.ctx.resolveBranchId(principal, mtp.branchId);

    // Get all issues during MTP
    const issues = await this.ctx.prisma.bloodIssue.findMany({
      where: { branchId: mtp.branchId, createdAt: { gte: mtp.activatedAt, lte: mtp.deactivatedAt ?? new Date() } },
      include: { bloodUnit: { select: { id: true, unitNumber: true, bloodGroup: true, componentType: true } } },
    });

    return { ...mtp, issues };
  }
}
