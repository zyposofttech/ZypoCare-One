import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateRequestDto, RegisterSampleDto, RecordCrossMatchDto, ElectronicXMDto } from "./dto";

@Injectable()
export class CrossMatchService {
  constructor(private readonly ctx: BBContextService) {}

  async listRequests(principal: Principal, opts: { branchId?: string | null; status?: string; urgency?: string }) {
    const bid = this.ctx.resolveBranchId(principal, opts.branchId);
    const where: any = { branchId: bid };
    if (opts.status) where.status = opts.status;
    if (opts.urgency) where.urgency = opts.urgency;
    return this.ctx.prisma.bloodRequest.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, uhid: true } },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    });
  }

  async getRequest(principal: Principal, id: string) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({
      where: { id },
      include: {
        patient: true,
        patientSample: true,
        crossMatches: { include: { bloodUnit: true } },
      },
    });
    if (!request) throw new NotFoundException("Blood request not found");
    this.ctx.resolveBranchId(principal, request.branchId);
    return request;
  }

  async createRequest(principal: Principal, dto: CreateRequestDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const requestNumber = `BR-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.ctx.prisma.bloodRequest.create({
      data: {
        branchId: bid,
        requestNumber,
        patientId: dto.patientId!,
        encounterId: dto.encounterId,
        requestedComponent: dto.componentType as any,
        quantityUnits: dto.quantityRequested ?? 1,
        urgency: (dto.urgency as any) ?? "ROUTINE",
        indication: dto.indication,
        requestedByStaffId: principal.userId,
        status: "PENDING",
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_REQUEST_CREATE", entity: "BloodRequest", entityId: result.id,
      meta: { requestNumber, patientId: dto.patientId, urgency: dto.urgency },
    });
    return result;
  }

  async registerSample(principal: Principal, requestId: string, dto: RegisterSampleDto) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Blood request not found");
    const bid = this.ctx.resolveBranchId(principal, request.branchId);

    const result = await this.ctx.prisma.patientBloodSample.create({
      data: {
        requestId,
        sampleId: dto.sampleId ?? `PS-${Date.now().toString(36).toUpperCase()}`,
        collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : new Date(),
        collectedByStaffId: principal.userId,
        verifiedByStaffId: dto.verifiedBy,
      },
    });

    await this.ctx.prisma.bloodRequest.update({
      where: { id: requestId },
      data: { status: "SAMPLE_RECEIVED" },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_SAMPLE_REGISTERED", entity: "PatientBloodSample", entityId: result.id,
      meta: { requestId, sampleId: result.sampleId },
    });
    return result;
  }

  async patientGrouping(principal: Principal, requestId: string, dto: any) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Blood request not found");
    const bid = this.ctx.resolveBranchId(principal, request.branchId);

    // Store patient grouping in the patient sample
    const sample = await this.ctx.prisma.patientBloodSample.findUnique({ where: { requestId } });
    if (!sample) throw new BadRequestException("No patient sample registered for this request");
    const result = await this.ctx.prisma.patientBloodSample.update({
      where: { id: sample.id },
      data: { patientBloodGroup: dto.bloodGroup, patientAntibodies: dto.antibodies },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_PATIENT_GROUPING", entity: "BloodRequest", entityId: requestId,
      meta: { bloodGroup: dto.bloodGroup },
    });
    return result;
  }

  async recordCrossMatch(principal: Principal, requestId: string, dto: RecordCrossMatchDto) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Blood request not found");
    const bid = this.ctx.resolveBranchId(principal, request.branchId);

    const sample = await this.ctx.prisma.patientBloodSample.findFirst({
      where: { requestId },
      orderBy: { createdAt: "desc" },
    });
    if (!sample) throw new BadRequestException("No patient sample registered for this request");

    const unit = await this.ctx.prisma.bloodUnit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    if (unit.status !== "AVAILABLE" && unit.status !== "RESERVED") {
      throw new BadRequestException(`Unit status ${unit.status} is not eligible for cross-matching`);
    }

    const certificateNumber = `XM-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.ctx.prisma.crossMatchTest.create({
      data: {
        requestId,
        sampleId: sample.id,
        bloodUnitId: dto.unitId!,
        method: (dto.method as any) ?? "AHG_INDIRECT_COOMBS",
        result: (dto.result as any) ?? "PENDING",
        certificateNumber,
        testedByStaffId: principal.userId,
        validUntil: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    if (dto.result === "COMPATIBLE") {
      await this.ctx.prisma.bloodUnit.update({ where: { id: dto.unitId }, data: { status: "CROSS_MATCHED" } });
      await this.ctx.prisma.bloodRequest.update({ where: { id: requestId }, data: { status: "READY" } });
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_CROSSMATCH_RECORDED", entity: "CrossMatchTest", entityId: result.id,
      meta: { requestId, unitId: dto.unitId, result: dto.result, certificateNumber },
    });
    return result;
  }

  async electronicCrossMatch(principal: Principal, requestId: string, dto: ElectronicXMDto) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Blood request not found");
    const bid = this.ctx.resolveBranchId(principal, request.branchId);

    const unit = await this.ctx.prisma.bloodUnit.findUnique({
      where: { id: dto.unitId },
      include: { groupingResults: true, ttiTests: true },
    });
    if (!unit) throw new NotFoundException("Blood unit not found");

    // Electronic XM eligibility: no antibodies, 2 consistent ABO/Rh results
    const verifiedGrouping = unit.groupingResults.find((g) => g.verifiedByStaffId);
    if (!verifiedGrouping) throw new BadRequestException("Unit grouping not verified");
    const anyReactiveTTI = unit.ttiTests.some((t) => t.result === "REACTIVE");
    if (anyReactiveTTI) throw new BadRequestException("Unit has reactive TTI results");

    const sample = await this.ctx.prisma.patientBloodSample.findUnique({
      where: { requestId },
    });

    const compatible = this.isABOCompatible((sample?.patientBloodGroup as string | null) ?? null, (unit.bloodGroup as string | null) ?? null);
    const certificateNumber = `EXM-${Date.now().toString(36).toUpperCase()}`;

    const result = await this.ctx.prisma.crossMatchTest.create({
      data: {
        requestId,
        sampleId: sample?.id ?? "",
        bloodUnitId: dto.unitId,
        method: "ELECTRONIC",
        result: compatible ? "COMPATIBLE" : "INCOMPATIBLE",
        certificateNumber,
        testedByStaffId: principal.userId,
        validUntil: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    if (compatible) {
      await this.ctx.prisma.bloodUnit.update({ where: { id: dto.unitId }, data: { status: "CROSS_MATCHED" } });
      await this.ctx.prisma.bloodRequest.update({ where: { id: requestId }, data: { status: "READY" } });
    }

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_ELECTRONIC_XM", entity: "CrossMatchTest", entityId: result.id,
      meta: { requestId, unitId: dto.unitId, compatible, certificateNumber },
    });
    return result;
  }

  async getCertificate(principal: Principal, requestId: string) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Blood request not found");
    this.ctx.resolveBranchId(principal, request.branchId);

    const crossMatches = await this.ctx.prisma.crossMatchTest.findMany({
      where: { requestId, result: "COMPATIBLE" },
      include: {
        bloodUnit: { select: { id: true, unitNumber: true, bloodGroup: true, componentType: true, expiryDate: true } },
        sample: true,
      },
    });
    return {
      requestId,
      requestNumber: request.requestNumber,
      patientId: request.patientId,
      crossMatches,
    };
  }

  async suggestCompatibleUnits(principal: Principal, requestId: string) {
    const request = await this.ctx.prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Blood request not found");
    const bid = this.ctx.resolveBranchId(principal, request.branchId);

    const sample = await this.ctx.prisma.patientBloodSample.findUnique({ where: { requestId } });
    const compatibleGroups = this.getCompatibleBloodGroups(sample?.patientBloodGroup ?? null);
    return this.ctx.prisma.bloodUnit.findMany({
      where: {
        branchId: bid,
        status: "AVAILABLE",
        bloodGroup: { in: compatibleGroups as any[] },
        componentType: request.requestedComponent ?? undefined,
      },
      orderBy: { expiryDate: "asc" },
      take: 20,
    });
  }

  private isABOCompatible(patientGroup: string | null, unitGroup: string | null): boolean {
    if (!patientGroup || !unitGroup) return false;
    const compatMap: Record<string, string[]> = {
      A_POS: ["A_POS", "A_NEG", "O_POS", "O_NEG"],
      A_NEG: ["A_NEG", "O_NEG"],
      B_POS: ["B_POS", "B_NEG", "O_POS", "O_NEG"],
      B_NEG: ["B_NEG", "O_NEG"],
      AB_POS: ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"],
      AB_NEG: ["A_NEG", "B_NEG", "AB_NEG", "O_NEG"],
      O_POS: ["O_POS", "O_NEG"],
      O_NEG: ["O_NEG"],
    };
    return (compatMap[patientGroup] ?? []).includes(unitGroup);
  }

  private getCompatibleBloodGroups(patientGroup: string | null): string[] {
    if (!patientGroup) return [];
    const compatMap: Record<string, string[]> = {
      A_POS: ["A_POS", "A_NEG", "O_POS", "O_NEG"],
      A_NEG: ["A_NEG", "O_NEG"],
      B_POS: ["B_POS", "B_NEG", "O_POS", "O_NEG"],
      B_NEG: ["B_NEG", "O_NEG"],
      AB_POS: ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"],
      AB_NEG: ["A_NEG", "B_NEG", "AB_NEG", "O_NEG"],
      O_POS: ["O_POS", "O_NEG"],
      O_NEG: ["O_NEG"],
    };
    return compatMap[patientGroup] ?? [];
  }
}
