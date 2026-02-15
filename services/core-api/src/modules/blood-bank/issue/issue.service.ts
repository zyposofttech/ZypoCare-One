import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type {
  IssueBloodDto, BedsideVerifyDto, StartTransfusionDto,
  RecordVitalsDto, EndTransfusionDto, ReportReactionDto,
  ReturnUnitDto, ActivateMTPDto, ReleaseMtpPackDto,
} from "./dto";

@Injectable()
export class IssueService {
  constructor(private readonly ctx: BBContextService) { }

  /**
   * Mandatory TTI tests for release / issue.
   * Note: stored as string in DB, so we normalize case when validating.
   */
  private static readonly REQUIRED_TTI = ["HIV", "HBsAg", "HCV", "Syphilis", "Malaria"] as const;

  private actorStaffId(principal: Principal): string {
    const p: any = principal as any;
    return String(p?.staffId ?? p?.userId ?? "SYSTEM");
  }

  private isABOCompatible(patient: string | null, unit: string | null): boolean {
    if (!patient || !unit) return false;
    const map: Record<string, string[]> = {
      O_NEG: ["O_NEG"],
      O_POS: ["O_NEG", "O_POS"],
      A_NEG: ["O_NEG", "A_NEG"],
      A_POS: ["O_NEG", "O_POS", "A_NEG", "A_POS"],
      B_NEG: ["O_NEG", "B_NEG"],
      B_POS: ["O_NEG", "O_POS", "B_NEG", "B_POS"],
      AB_NEG: ["O_NEG", "A_NEG", "B_NEG", "AB_NEG"],
      AB_POS: ["O_NEG", "O_POS", "A_NEG", "A_POS", "B_NEG", "B_POS", "AB_NEG", "AB_POS"],
    };
    return (map[patient] ?? []).includes(unit);
  }

  private normalizeTestName(name: string): string {
    return String(name ?? "").trim().toLowerCase();
  }

  private ttiGateFailures(unit: any): string[] {
    const latestByName = new Map<string, any>();
    for (const t of unit?.ttiTests ?? []) {
      const k = this.normalizeTestName(t.testName);
      if (!latestByName.has(k)) latestByName.set(k, t);
    }

    const missing = IssueService.REQUIRED_TTI.filter((n) => !latestByName.has(this.normalizeTestName(n)));
    const failures: string[] = [];
    if (missing.length) failures.push(`MISSING:${missing.join(",")}`);

    for (const req of IssueService.REQUIRED_TTI) {
      const t = latestByName.get(this.normalizeTestName(req));
      const res = String(t?.result ?? "PENDING");
      if (!t?.verifiedByStaffId) failures.push(`${req}:NOT_VERIFIED`);
      else if (res === "PENDING") failures.push(`${req}:PENDING`);
      else if (res === "INDETERMINATE") failures.push(`${req}:INDETERMINATE`);
      else if (res === "REACTIVE") failures.push(`${req}:REACTIVE`);
    }
    return failures;
  }

  private groupingGateFailures(unit: any): string[] {
    const g = unit?.groupingResults?.[0];
    const failures: string[] = [];
    if (!g?.verifiedByStaffId) failures.push("GROUPING:NOT_VERIFIED");
    if (g?.hasDiscrepancy) failures.push("GROUPING:DISCREPANCY");
    if (!unit?.bloodGroup) failures.push("GROUPING:NO_CONFIRMED_GROUP");
    return failures;
  }

  private equipmentGateFailures(unit: any, blockedEquipmentIds: Set<string>): string[] {
    const slot = unit?.inventorySlot;
    const eq = slot?.equipment;
    const failures: string[] = [];
    if (!slot?.equipmentId || !eq) failures.push("COLDCHAIN:NO_EQUIPMENT");
    else {
      if (!eq.isActive) failures.push("COLDCHAIN:EQUIPMENT_INACTIVE");
      if (eq.calibrationDueDate && eq.calibrationDueDate.getTime() < Date.now()) failures.push("COLDCHAIN:CALIBRATION_OVERDUE");
      if (blockedEquipmentIds.has(eq.id)) failures.push("COLDCHAIN:TEMP_BREACH_PENDING_ACK");
    }
    return failures;
  }

  private async fetchBlockedEquipmentIds(tx: any, equipmentIds: string[]): Promise<Set<string>> {
    if (!equipmentIds.length) return new Set<string>();
    const breaches = await tx.equipmentTempLog.findMany({
      where: {
        equipmentId: { in: equipmentIds },
        isBreaching: true,
        acknowledged: false,
      },
      select: { equipmentId: true },
    });
    return new Set(breaches.map((b: any) => String(b.equipmentId)));
  }

  private async allocateEmergencyUnits(
    tx: any,
    opts: {
      branchId: string;
      componentType: string;
      bloodGroups: string[];
      quantity: number;
    },
  ) {
    const now = new Date();
    const qty = Math.max(0, Number(opts.quantity) || 0);
    if (!qty) return [];

    // Pull a reasonably sized candidate set and pick FEFO.
    const candidates = await tx.bloodUnit.findMany({
      where: {
        branchId: opts.branchId,
        status: "AVAILABLE",
        isActive: true,
        componentType: opts.componentType as any,
        bloodGroup: { in: opts.bloodGroups as any },
        expiryDate: { gt: now },
      },
      include: {
        groupingResults: { orderBy: { createdAt: "desc" }, take: 1 },
        ttiTests: { orderBy: { createdAt: "desc" } },
        inventorySlot: { include: { equipment: true } },
      },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
      take: 250,
    });

    const equipmentIds: string[] = Array.from(
      new Set<string>(
        candidates
          .map((u: any) => u?.inventorySlot?.equipmentId)
          .filter((x: any) => !!x)
          .map((x: any) => String(x)),
      ),
    );
    const blockedEq = await this.fetchBlockedEquipmentIds(tx, equipmentIds);

    const picked: any[] = [];
    const rejects: Array<{ unitId: string; reasons: string[] }> = [];

    for (const unit of candidates) {
      if (picked.length >= qty) break;

      const reasons = [
        ...this.groupingGateFailures(unit),
        ...this.ttiGateFailures(unit),
        ...this.equipmentGateFailures(unit, blockedEq),
      ];

      if (reasons.length) {
        rejects.push({ unitId: unit.id, reasons });
        continue;
      }

      // Concurrency-safe reservation (AVAILABLE -> RESERVED)
      const reserved = await tx.bloodUnit.updateMany({
        where: { id: unit.id, status: "AVAILABLE" },
        data: { status: "RESERVED" },
      });
      if (reserved?.count === 1) {
        picked.push(unit);
      }
    }

    if (picked.length < qty) {
      const shortage = qty - picked.length;
      const sampleRejects = rejects.slice(0, 8);
      throw new BadRequestException(
        `Insufficient eligible units for emergency release. Need ${qty}, allocated ${picked.length} (short by ${shortage}). ` +
        (sampleRejects.length ? `Sample rejects: ${sampleRejects.map((r) => `${r.unitId}:${r.reasons.join("|")}`).join(", ")}` : ""),
      );
    }

    return picked;
  }

  private async assertSafetyGatesForIssue(principal: Principal, crossMatchId: string) {
    const crossMatch = await this.ctx.prisma.crossMatchTest.findUnique({
      where: { id: crossMatchId },
      include: {
        request: { select: { id: true, branchId: true, status: true, patientId: true } },
        bloodUnit: {
          include: {
            groupingResults: { orderBy: { createdAt: "desc" }, take: 1 },
            ttiTests: { orderBy: { createdAt: "desc" } },
            inventorySlot: { include: { equipment: true } },
          },
        },
      },
    });
    if (!crossMatch) throw new NotFoundException("Cross-match not found");

    const bid = this.ctx.resolveBranchId(principal, crossMatch.request.branchId);

    // --- Gate 1: Cross-match must be valid and compatible ---
    if (crossMatch.result !== "COMPATIBLE") {
      throw new BadRequestException("Cross-match result is not compatible");
    }
    if (crossMatch.validUntil && crossMatch.validUntil.getTime() < Date.now()) {
      throw new BadRequestException("Cross-match has expired. Re-cross-match required.");
    }
    // Backstop (older records may not have validUntil)
    const hoursElapsed = (Date.now() - crossMatch.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > 72) {
      throw new BadRequestException("Cross-match has expired (>72 hours). Re-cross-match required.");
    }

    // --- Gate 2: Request lifecycle must be READY ---
    if (crossMatch.request.status !== "READY") {
      throw new BadRequestException(`Request is not READY for issue (current: ${crossMatch.request.status}).`);
    }

    const unit = crossMatch.bloodUnit;
    if (!unit) throw new BadRequestException("Blood unit is missing for this cross-match");

    // --- Gate 3: Unit state must be eligible ---
    if (!unit.isActive) throw new BadRequestException("Blood unit is inactive");
    if (unit.status !== "CROSS_MATCHED") {
      throw new BadRequestException(`Unit status ${unit.status} is not eligible for issue. Unit must be CROSS_MATCHED.`);
    }
    if (unit.expiryDate && unit.expiryDate.getTime() < Date.now()) {
      throw new BadRequestException("Unit has expired and cannot be issued");
    }

    // --- Gate 4: Grouping must be verified and discrepancy-free ---
    const latestGrouping = unit.groupingResults?.[0];
    if (!latestGrouping?.verifiedByStaffId) {
      throw new BadRequestException("Unit grouping is not verified");
    }
    if (latestGrouping.hasDiscrepancy) {
      throw new BadRequestException("Unit grouping has a discrepancy. Resolve discrepancy before issue.");
    }
    if (!unit.bloodGroup) {
      throw new BadRequestException("Unit blood group is not confirmed");
    }

    // --- Gate 5: TTI tests must be NON_REACTIVE and verified ---
    const latestByName = new Map<string, any>();
    for (const t of unit.ttiTests ?? []) {
      const k = this.normalizeTestName(t.testName);
      if (!latestByName.has(k)) latestByName.set(k, t);
    }

    const missing = IssueService.REQUIRED_TTI.filter((n) => !latestByName.has(this.normalizeTestName(n)));
    if (missing.length) {
      throw new BadRequestException(`Missing mandatory TTI test(s): ${missing.join(", ")}`);
    }

    const bad: string[] = [];
    for (const req of IssueService.REQUIRED_TTI) {
      const t = latestByName.get(this.normalizeTestName(req));
      const res = String(t?.result ?? "PENDING");
      if (!t?.verifiedByStaffId) bad.push(`${req}: NOT_VERIFIED`);
      else if (res === "PENDING") bad.push(`${req}: PENDING`);
      else if (res === "INDETERMINATE") bad.push(`${req}: INDETERMINATE`);
      else if (res === "REACTIVE") bad.push(`${req}: REACTIVE`);
    }
    if (bad.length) {
      // Defensive: quarantine if any reactive test is present
      const anyReactive = bad.some((x) => x.includes("REACTIVE"));
      if (anyReactive) {
        await this.ctx.prisma.bloodUnit.update({ where: { id: unit.id }, data: { status: "QUARANTINED" } });
      }
      throw new BadRequestException(`TTI safety gate failed: ${bad.join("; ")}`);
    }

    // --- Gate 6: Cold-chain & equipment compliance ---
    const slot = unit.inventorySlot;
    if (!slot?.equipment) {
      throw new BadRequestException("Unit has no assigned storage equipment. Assign storage location before issue.");
    }
    const eq = slot.equipment;
    if (!eq.isActive) throw new BadRequestException("Storage equipment is inactive");
    if (eq.calibrationDueDate && eq.calibrationDueDate.getTime() < Date.now()) {
      throw new BadRequestException(
        `Storage equipment calibration is overdue (equipment: ${eq.equipmentId}). Calibrate before issuing units stored here.`,
      );
    }

    const breach = await this.ctx.prisma.equipmentTempLog.findFirst({
      where: {
        equipmentId: eq.id,
        isBreaching: true,
        acknowledged: false,
      },
      orderBy: { recordedAt: "desc" },
      select: { id: true, recordedAt: true, temperatureC: true },
    });
    if (breach) {
      throw new BadRequestException(
        `Temperature breach pending acknowledgement for equipment ${eq.equipmentId}. ` +
        `Breach log ${breach.id} at ${breach.recordedAt.toISOString()} (temp: ${String(breach.temperatureC)}°C).`,
      );
    }

    return { bid, crossMatch, unit, equipment: eq };
  }

  private buildVitals(dto: any, principal: Principal) {
    const base = dto?.vitals && typeof dto.vitals === "object" ? { ...dto.vitals } : {};
    const direct = {
      temperature: dto?.temperature,
      pulseRate: dto?.pulseRate,
      bloodPressure: dto?.bloodPressure,
      respiratoryRate: dto?.respiratoryRate,
      notes: dto?.notes,
    };
    const merged: any = { ...base };
    for (const [k, v] of Object.entries(direct)) {
      if (v !== undefined && v !== null && v !== "") merged[k] = v;
    }
    merged.recordedAt = new Date();
    merged.recordedBy = this.actorStaffId(principal);
    return merged;
  }

  private appendVitals(existing: any, entry: any) {
    if (!existing) return entry;
    if (Array.isArray(existing)) return [...existing, entry];
    return [existing, entry];
  }

  private vitalsUpdateForInterval(
    transfusion: any,
    intervalIndex: number,
    dto: RecordVitalsDto,
    principal: Principal,
  ): Record<string, unknown> {
    const intervalRaw = String(dto?.interval ?? "").trim().toUpperCase();
    let bucket: "preVitals" | "vitals15Min" | "vitals30Min" | "vitals1Hr";

    if (intervalRaw === "PRE") bucket = "preVitals";
    else if (intervalRaw === "15MIN") bucket = "vitals15Min";
    else if (intervalRaw === "30MIN") bucket = "vitals30Min";
    else if (intervalRaw === "1HR" || intervalRaw === "END") bucket = "vitals1Hr";
    else if (intervalIndex <= 0) bucket = "vitals15Min";
    else if (intervalIndex === 1) bucket = "vitals30Min";
    else bucket = "vitals1Hr";

    const entry = this.buildVitals(dto, principal);
    const data: Record<string, unknown> = {
      [bucket]: this.appendVitals((transfusion as any)[bucket], entry),
    };

    if (dto.volumeTransfused !== undefined && dto.volumeTransfused !== null) {
      data.totalVolumeMl = dto.volumeTransfused;
    }

    return data;
  }

  async listIssues(
    principal: Principal,
    opts: {
      branchId?: string | null;
      transfusing?: boolean;
      transfusedToday?: boolean;
    },
  ) {
    const bid = this.ctx.resolveBranchId(principal, opts.branchId);

    const issues = await this.ctx.prisma.bloodIssue.findMany({
      where: { branchId: bid },
      include: {
        bloodUnit: {
          select: {
            id: true,
            unitNumber: true,
            bloodGroup: true,
            componentType: true,
            status: true,
          },
        },
        request: {
          select: {
            id: true,
            patient: {
              select: {
                name: true,
                uhid: true,
              },
            },
          },
        },
        crossMatch: {
          select: {
            id: true,
            certificateNumber: true,
          },
        },
        transfusionRecord: {
          select: {
            startedAt: true,
            endedAt: true,
            hasReaction: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    let rows = issues.map((issue) => {
      const patientName = (issue.request?.patient?.name ?? "").trim();
      const [firstName, ...rest] = patientName ? patientName.split(/\s+/) : [];
      const lastName = rest.join(" ");
      const startedAt = issue.transfusionRecord?.startedAt ?? null;
      const endedAt = issue.transfusionRecord?.endedAt ?? null;
      const status = this.deriveIssueStatus(issue);

      return {
        id: issue.id,
        issueNumber: issue.issueNumber,
        unitNumber: issue.bloodUnit?.unitNumber ?? null,
        patient: {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          uhid: issue.request?.patient?.uhid ?? undefined,
        },
        patientName: patientName || null,
        crossMatchRef: issue.crossMatch?.certificateNumber ?? issue.crossMatch?.id ?? null,
        crossMatchId: issue.crossMatchId ?? null,
        issuedToPerson: issue.issuedToPerson ?? null,
        issuedToWard: issue.issuedToWard ?? null,
        transportBoxTemp: this.normalizeDecimal(issue.transportBoxTemp),
        status,
        issuedAt: issue.issuedAt,
        createdAt: issue.createdAt,
        notes: issue.inspectionNotes ?? issue.returnReason ?? null,
        startedAt,
        endedAt,
        component: issue.bloodUnit?.componentType ?? null,
        bloodGroup: issue.bloodUnit?.bloodGroup ?? null,
        reactionFlagged: issue.transfusionRecord?.hasReaction ?? false,
      };
    });

    if (opts.transfusing) {
      // Include hard-stop reaction cases in the monitor so they don't disappear.
      rows = rows.filter((r) => r.status === "ACTIVE" || r.status === "IN_PROGRESS" || r.status === "REACTION");
    }


    if (opts.transfusedToday) {
      const today = new Date().toISOString().slice(0, 10);
      rows = rows.filter((r) => {
        if (r.status !== "COMPLETED") return false;
        if (!r.endedAt) return false;
        return new Date(r.endedAt).toISOString().slice(0, 10) === today;
      });
    }

    return rows;
  }

  async listMtpSessions(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);

    const sessions = await this.ctx.prisma.mTPSession.findMany({
      where: { branchId: bid },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
        bloodIssues: {
          select: {
            id: true,
            bloodUnit: {
              select: {
                componentType: true,
              },
            },
          },
        },
      },
      orderBy: { activatedAt: "desc" },
    });

    return sessions.map((session) => {
      let prbcCount = 0;
      let ffpCount = 0;
      let pltCount = 0;

      for (const issue of session.bloodIssues) {
        const component = String(issue.bloodUnit?.componentType ?? "");
        if (component === "PRBC") prbcCount += 1;
        else if (component === "FFP") ffpCount += 1;
        else if (component === "PLATELET_RDP" || component === "PLATELET_SDP") pltCount += 1;
      }

      const summary = session.summary && typeof session.summary === "object" ? (session.summary as any) : null;
      const indication = summary?.clinicalIndication ?? summary?.indication ?? null;

      return {
        id: session.id,
        mtpId: session.id,
        patientId: session.patient?.id ?? session.patientId,
        patientName: session.patient?.name ?? null,
        patient: session.patient?.name ?? null,
        indication,
        activatedAt: session.activatedAt,
        deactivatedAt: session.deactivatedAt,
        completedAt: session.deactivatedAt,
        status: session.status === "DEACTIVATED" ? "COMPLETED" : session.status,
        unitsIssued: session.bloodIssues.length,
        prbcCount,
        ffpCount,
        pltCount,
      };
    });
  }

  async issueBlood(principal: Principal, dto: IssueBloodDto) {
    const crossMatchId = String(dto.crossMatchId ?? "").trim();
    if (!crossMatchId) throw new BadRequestException("crossMatchId is required");
    const { bid, crossMatch, unit } = await this.assertSafetyGatesForIssue(principal, crossMatchId);

    const issueNumber = `BI-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.ctx.prisma.bloodIssue.create({
      data: {
        branchId: bid,
        issueNumber,
        bloodUnitId: crossMatch.bloodUnitId,
        requestId: crossMatch.requestId,
        crossMatchId: dto.crossMatchId!,
        issuedToPerson: (dto.issuedToPerson ?? dto.issuedTo) || null,
        issuedToWard: dto.issuedToWard,
        transportBoxTemp: (dto.transportBoxTemp ?? dto.transportTemp) ?? null,
        issuedByStaffId: this.actorStaffId(principal),
        inspectionNotes: dto.inspectionNotes ?? dto.notes,
      },
    });

    await this.ctx.prisma.bloodUnit.update({ where: { id: crossMatch.bloodUnitId }, data: { status: "ISSUED" } });
    await this.ctx.prisma.bloodRequest.update({ where: { id: crossMatch.requestId }, data: { status: "ISSUED" } });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_BLOOD_ISSUED", entity: "BloodIssue", entityId: result.id,
      meta: {
        unitId: crossMatch.bloodUnitId,
        requestId: crossMatch.requestId,
        issuedTo: dto.issuedToPerson ?? dto.issuedTo,
        transportBoxTemp: dto.transportBoxTemp ?? dto.transportTemp,
        unitNumber: unit.unitNumber,
        bloodGroup: unit.bloodGroup,
        componentType: unit.componentType,
      },
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

    const existing = await this.ctx.prisma.transfusionRecord.findUnique({ where: { issueId } });
    if (existing?.startedAt) {
      throw new BadRequestException("Bedside verification cannot be modified after transfusion has started");
    }

    const isEmergency = !!issue.isEmergencyIssue || issue.request.urgency === "EMERGENCY";

    const scannedPatient = String(dto.scannedPatientId ?? "").trim();
    const scannedUnit = String(dto.scannedUnitBarcode ?? "").trim();
    const verifier2 = String((dto as any).verifier2StaffId ?? "").trim();

    // Non-emergency bedside verification requires scans + two-person check.
    if (!isEmergency) {
      if (!scannedPatient) throw new BadRequestException("Wristband scan is required for bedside verification");
      if (!scannedUnit) throw new BadRequestException("Unit barcode scan is required for bedside verification");
      if (!verifier2) throw new BadRequestException("Second verifier is required for bedside verification");
    }

    const reasons: string[] = [];
    const patientMatches = !scannedPatient
      ? false
      : (scannedPatient === issue.request.patientId || scannedPatient === issue.request.patient.uhid);
    const unitMatches = !scannedUnit
      ? false
      : (scannedUnit === issue.bloodUnit.barcode || scannedUnit === issue.bloodUnit.unitNumber);

    if (scannedPatient && !patientMatches) reasons.push("PATIENT_MISMATCH");
    if (scannedUnit && !unitMatches) reasons.push("UNIT_MISMATCH");

    // Safety: ABO/Rh compatibility (strict). Uses sample blood group if available.
    const sample = await this.ctx.prisma.patientBloodSample.findUnique({ where: { requestId: issue.requestId } });
    if (sample?.patientBloodGroup && issue.bloodUnit.bloodGroup) {
      const ok = this.isABOCompatible(sample.patientBloodGroup as any, issue.bloodUnit.bloodGroup as any);
      if (!ok) reasons.push("ABO_INCOMPATIBLE");
    }

    // Near-miss workflow: record event + hard block.
    if (reasons.length > 0) {
      await this.ctx.prisma.transfusionRecord.upsert({
        where: { issueId },
        create: {
          branchId: bid,
          issueId,
          patientId: issue.request.patientId,
          bedsideVerifier1StaffId: this.actorStaffId(principal),
          bedsideVerifier2StaffId: verifier2 || null,
          bedsideVerifiedAt: new Date(),
          patientWristbandScan: !!scannedPatient,
          unitBarcodeScan: !!scannedUnit,
          bedsideVerificationOk: false,
        },
        update: {
          bedsideVerifier1StaffId: this.actorStaffId(principal),
          bedsideVerifier2StaffId: verifier2 || undefined,
          bedsideVerifiedAt: new Date(),
          patientWristbandScan: !!scannedPatient,
          unitBarcodeScan: !!scannedUnit,
          bedsideVerificationOk: false,
        },
      });

      await this.ctx.audit.log({
        branchId: bid,
        actorUserId: principal.userId,
        action: "BB_BEDSIDE_NEAR_MISS",
        entity: "BloodIssue",
        entityId: issueId,
        meta: {
          reasons,
          scannedPatient,
          scannedUnit,
          expectedPatientId: issue.request.patientId,
          expectedUhid: issue.request.patient.uhid,
          expectedUnitBarcode: issue.bloodUnit.barcode,
          expectedUnitNumber: issue.bloodUnit.unitNumber,
          patientBloodGroup: sample?.patientBloodGroup ?? null,
          unitBloodGroup: issue.bloodUnit.bloodGroup ?? null,
          verifier1: this.actorStaffId(principal),
          verifier2: verifier2 || null,
        },
      });

      throw new BadRequestException(
        `Near-miss recorded (${reasons.join(", ")}). Bedside verification failed; transfusion is blocked until re-verified.`
      );
    }

    const result = await this.ctx.prisma.transfusionRecord.upsert({
      where: { issueId },
      create: {
        branchId: bid,
        issueId,
        patientId: issue.request.patientId,
        bedsideVerifier1StaffId: this.actorStaffId(principal),
        bedsideVerifier2StaffId: verifier2 || null,
        bedsideVerifiedAt: new Date(),
        patientWristbandScan: !!scannedPatient,
        unitBarcodeScan: !!scannedUnit,
        bedsideVerificationOk: true,
      },
      update: {
        bedsideVerifier1StaffId: this.actorStaffId(principal),
        bedsideVerifier2StaffId: verifier2 || undefined,
        bedsideVerifiedAt: new Date(),
        patientWristbandScan: !!scannedPatient,
        unitBarcodeScan: !!scannedUnit,
        bedsideVerificationOk: true,
      },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_BEDSIDE_VERIFIED",
      entity: "BloodIssue",
      entityId: issueId,
      meta: { scannedPatient, scannedUnit, verifier2: verifier2 || null },
    });

    return result;
  }


  async startTransfusion(principal: Principal, issueId: string, dto: StartTransfusionDto) {
  const issue = await this.ctx.prisma.bloodIssue.findUnique({
    where: { id: issueId },
    include: {
      request: { select: { id: true, patientId: true, urgency: true } },
    },
  });
  if (!issue) throw new NotFoundException("Issue record not found");
  const bid = this.ctx.resolveBranchId(principal, issue.branchId);

  const existingRecord = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
  if (!existingRecord) throw new NotFoundException("Transfusion record not found");

  if (!existingRecord.bedsideVerifiedAt) {
    throw new BadRequestException("Bedside verification timestamp missing. Re-verify before starting transfusion");
  }

  // PRD S9: Allergy/Reaction hard-stop gate
  // If patient has serious reaction history, starting requires explicit override (except emergency/MTP).
  const urgency = String(issue.request?.urgency ?? "").toUpperCase();
  const isEmergency = urgency === "EMERGENCY" || urgency === "MTP" || issue.isEmergencyIssue === true;
  if (!isEmergency) {
    const recentSerious = await this.ctx.prisma.transfusionReaction.findFirst({
      where: {
        transfusionRecord: { patientId: issue.request.patientId },
        OR: [
          { severity: { in: ["SEVERE", "LIFE_THREATENING", "FATAL"] } },
          { reactionType: "ANAPHYLAXIS" },
          { reactionType: "HEMOLYTIC_ACUTE" },
          { reactionType: "BACTERIAL" },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, severity: true, reactionType: true, createdAt: true },
    });

    if (recentSerious && !dto.highRiskOverride) {
      throw new BadRequestException(
        `HIGH_RISK_OVERRIDE_REQUIRED: Patient has history of serious transfusion reaction ` +
          `(${recentSerious.reactionType}/${recentSerious.severity ?? "UNKNOWN"}) recorded on ` +
          `${recentSerious.createdAt.toISOString()}. Doctor override is required to start transfusion.`,
      );
    }

    if (recentSerious && dto.highRiskOverride) {
      await this.ctx.audit.log({
        branchId: bid,
        actorUserId: principal.userId,
        action: "BB_TRANSFUSION_HIGH_RISK_OVERRIDE",
        entity: "BloodIssue",
        entityId: issueId,
        meta: {
          patientId: issue.request.patientId,
          priorReactionId: recentSerious.id,
          priorReactionType: recentSerious.reactionType,
          priorSeverity: recentSerious.severity,
          overrideReason: dto.highRiskOverrideReason ?? null,
        },
      });
    }
  }

  const now = new Date();
  const preVitals = this.buildVitals(dto, principal);
  if (dto.startNotes) {
    (preVitals as any).startNotes = dto.startNotes;
  }

  const result = await this.ctx.prisma.transfusionRecord.update({
    where: { id: existingRecord.id },
    data: {
      startedAt: now,
      preVitals,
      administeredByStaffId: this.actorStaffId(principal),
    },
  });

  await this.ctx.audit.log({
    branchId: bid,
    actorUserId: principal.userId,
    action: "BB_TRANSFUSION_STARTED",
    entity: "TransfusionRecord",
    entityId: result.id,
    meta: { issueId, startedAt: now.toISOString(), verifiedBy: dto.verifiedBy ?? null },
  });

  return result;
}



  async recordVitals(principal: Principal, issueId: string, dto: RecordVitalsDto) {
  const transfusion = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
  if (!transfusion) throw new NotFoundException("Transfusion record not found");
  const bid = this.ctx.resolveBranchId(principal, transfusion.branchId);

  // PRD S9 hard-stop: once a reaction is reported (or transfusion stopped), vitals entry is blocked.
  if (transfusion.hasReaction) {
    throw new BadRequestException(
      "HARD_STOP: A transfusion reaction has already been reported for this issue. Further vitals entry is blocked. Use the Reaction workflow.",
    );
  }
  if (transfusion.endedAt) {
    throw new BadRequestException("Transfusion already ended. Vitals entry is not allowed.");
  }
  if (!transfusion.startedAt) {
    throw new BadRequestException("Transfusion has not started yet. Start transfusion before recording vitals.");
  }

  const lastReaction = await this.ctx.prisma.transfusionReaction.findFirst({
    where: { transfusionId: transfusion.id },
    orderBy: { createdAt: "desc" },
    select: { transfusionStopped: true },
  });
  if (lastReaction?.transfusionStopped) {
    throw new BadRequestException(
      "HARD_STOP: Transfusion was stopped due to a reported reaction. Vitals entry is blocked until case is closed.",
    );
  }

  const now = new Date();
  const startedAt = transfusion.startedAt;
  const intervalIndex = startedAt ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / (15 * 60 * 1000))) : 0;

  const vitalsData = this.vitalsUpdateForInterval(transfusion, intervalIndex, dto, principal);

  const result = await this.ctx.prisma.transfusionRecord.update({
    where: { id: transfusion.id },
    data: vitalsData,
  });

  await this.ctx.audit.log({
    branchId: bid,
    actorUserId: principal.userId,
    action: "BB_VITALS_RECORDED",
    entity: "TransfusionRecord",
    entityId: result.id,
    meta: { issueId, intervalIndex, recordedAt: now.toISOString() },
  });

  return result;
}


 async endTransfusion(principal: Principal, issueId: string, dto: EndTransfusionDto) {
  const transfusion = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
  if (!transfusion) throw new NotFoundException("Transfusion record not found");
  const bid = this.ctx.resolveBranchId(principal, transfusion.branchId);

  // PRD S9 hard-stop: completion endpoint cannot be used once a reaction exists.
  const reactionExists = await this.ctx.prisma.transfusionReaction.findFirst({
    where: { transfusionId: transfusion.id },
    select: { id: true },
  });
  if (transfusion.hasReaction || reactionExists) {
    throw new BadRequestException(
      "HARD_STOP: Reaction exists for this transfusion. Do not use End Transfusion. Use the Reaction workflow; it stops transfusion and quarantines the unit.",
    );
  }

  const issue = await this.ctx.prisma.bloodIssue.findUnique({
    where: { id: issueId },
    include: { request: true },
  });
  if (!issue) throw new NotFoundException("Issue record not found");

  // ensure branch scoping
  this.ctx.resolveBranchId(principal, issue.branchId);

  const result = await this.ctx.prisma.transfusionRecord.update({
    where: { id: transfusion.id },
    data: {
      endedAt: new Date(),
      postVitals: this.buildVitals(dto, principal),
      totalVolumeMl: dto.volumeTransfused ?? transfusion.totalVolumeMl,
      hasReaction: dto.hasReaction ?? false,
    },
  });

  // mark unit transfused + request completed (existing behavior)
  await this.ctx.prisma.bloodUnit.update({
    where: { id: issue.bloodUnitId },
    data: { status: "TRANSFUSED" },
  });

  await this.ctx.prisma.bloodRequest.update({
    where: { id: issue.requestId },
    data: { status: "COMPLETED" },
  });

  await this.ctx.audit.log({
    branchId: bid,
    actorUserId: principal.userId,
    action: "BB_TRANSFUSION_ENDED",
    entity: "TransfusionRecord",
    entityId: result.id,
    meta: { issueId, endedAt: result.endedAt?.toISOString() },
  });

  return result;
}

  async reportReaction(principal: Principal, issueId: string, dto: ReportReactionDto) {
  const transfusion = await this.ctx.prisma.transfusionRecord.findFirst({ where: { issueId } });
  if (!transfusion) throw new NotFoundException("Transfusion record not found");
  const bid = this.ctx.resolveBranchId(principal, transfusion.branchId);

  if (!transfusion.startedAt) {
    throw new BadRequestException("Transfusion has not started yet. Start transfusion before reporting an acute reaction.");
  }

  const issue = await this.ctx.prisma.bloodIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      branchId: true,
      bloodUnitId: true,
      requestId: true,
      request: { select: { patientId: true, urgency: true } },
      bloodUnit: { select: { id: true, status: true, unitNumber: true, donorId: true } },
    },
  });

  // S9 hard-stop defaults
  const stopTransfusion = dto.transfusionStopped !== false; // default true
  const onsetAt = dto.onsetTime ? new Date(dto.onsetTime) : new Date();
  const severityNorm = String(dto.severity ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN";
  const actorStaffId = this.actorStaffId(principal);

  const result = await this.ctx.prisma.$transaction(async (tx: any) => {
    const reaction = await tx.transfusionReaction.create({
      data: {
        transfusionId: transfusion.id,
        reactionType: dto.reactionType as any,
        severity: severityNorm,
        description: dto.description,
        onsetAt,
        managementNotes: dto.managementNotes,
        investigationResults: dto.investigationResults,
        transfusionStopped: stopTransfusion,
        reportedByStaffId: actorStaffId,
      },
    });

    // Update transfusion record: mark reaction + (optionally) stop transfusion immediately.
    const doctorNotifiedAt = dto.doctorNotified
      ? (dto.doctorNotifiedAt ? new Date(dto.doctorNotifiedAt) : new Date())
      : undefined;

    const postVitalsExisting =
      (transfusion.postVitals && typeof transfusion.postVitals === "object") ? transfusion.postVitals : {};

    const reactionStopSnapshot =
      dto.stopVitals && typeof dto.stopVitals === "object"
        ? {
            ...(dto.stopVitals as any),
            recordedAt: new Date(),
            recordedByStaffId: actorStaffId,
            reactionId: reaction.id,
            hardStop: stopTransfusion,
          }
        : {
            recordedAt: new Date(),
            recordedByStaffId: actorStaffId,
            reactionId: reaction.id,
            hardStop: stopTransfusion,
          };

    await tx.transfusionRecord.update({
      where: { id: transfusion.id },
      data: {
        hasReaction: true,
        doctorNotifiedAt,
        endedAt: stopTransfusion ? (transfusion.endedAt ?? new Date()) : undefined,
        postVitals: stopTransfusion
          ? { ...(postVitalsExisting as any), reactionStop: reactionStopSnapshot }
          : undefined,
      },
    });

    // Unit quarantine (only if it's still in ISSUED state)
    if (issue?.bloodUnitId && stopTransfusion) {
      await tx.bloodUnit.updateMany({
        where: { id: issue.bloodUnitId, status: "ISSUED" },
        data: { status: "QUARANTINED" },
      });
    }

    // Auto-open lookback case for severe/high-signal reactions (supports haemovigilance + traceability).
    const isSevere =
      ["SEVERE", "LIFE_THREATENING", "FATAL"].includes(severityNorm) ||
      ["BACTERIAL", "HEMOLYTIC_ACUTE", "ANAPHYLAXIS"].includes(String(dto.reactionType).toUpperCase());

    if (issue?.bloodUnitId && isSevere) {
      const unitNo = issue.bloodUnit?.unitNumber ?? issue.bloodUnitId;
      await tx.bloodLookbackCase.create({
        data: {
          branchId: bid,
          triggerType: "MANUAL",
          donorId: issue.bloodUnit?.donorId ?? null,
          notes: `Auto-opened due to transfusion reaction (${dto.reactionType}/${severityNorm}) for unit ${unitNo}.`,
          computedData: {
            trigger: "TRANSFUSION_REACTION",
            issueId,
            transfusionId: transfusion.id,
            reactionId: reaction.id,
            patientId: issue.request?.patientId ?? transfusion.patientId,
            bloodUnitId: issue.bloodUnitId,
            unitNumber: issue.bloodUnit?.unitNumber ?? null,
            reactionType: dto.reactionType,
            severity: severityNorm,
            onsetAt: onsetAt.toISOString(),
            hardStop: stopTransfusion,
            quarantineApplied: stopTransfusion && issue.bloodUnit?.status === "ISSUED",
          },
          createdByUserId: principal.userId,
        },
      });
    }

    return reaction;
  });

  await this.ctx.audit.log({
    branchId: bid,
    actorUserId: principal.userId,
    action: "BB_REACTION_REPORTED",
    entity: "TransfusionReaction",
    entityId: result.id,
    meta: {
      transfusionId: transfusion.id,
      issueId,
      bloodUnitId: issue?.bloodUnitId ?? null,
      reactionType: dto.reactionType,
      severity: severityNorm,
      hardStop: stopTransfusion,
      doctorNotified: dto.doctorNotified ?? null,
    },
  });

  if (stopTransfusion) {
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_TRANSFUSION_HARD_STOP",
      entity: "TransfusionRecord",
      entityId: transfusion.id,
      meta: { issueId, reactionId: result.id },
    });
  }

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
    const notes = (dto as any)?.notes ?? null;
    const clinicalIndication = dto.clinicalIndication ?? null;
    const result = await this.ctx.prisma.mTPSession.create({
      data: {
        branchId: bid,
        patientId: dto.patientId!,
        encounterId: dto.encounterId,
        summary:
          clinicalIndication || notes
            ? {
              clinicalIndication,
              notes,
            }
            : undefined,
        activatedByStaffId: this.actorStaffId(principal),
        activatedAt: new Date(),
        status: "ACTIVE",
      },
    });

    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_MTP_ACTIVATED", entity: "MTPSession", entityId: result.id,
      meta: { patientId: dto.patientId, clinicalIndication, notes },
    });
    return result;
  }
  /**
 * PRD S8: Emergency uncrossmatched MTP pack release.
 * Default: 4 O_NEG PRBC + 4 AB (POS/NEG) FFP.
 */
  async releaseMtpEmergencyPack(principal: Principal, mtpSessionId: string, dto: ReleaseMtpPackDto) {
    const mtp = await this.ctx.prisma.mTPSession.findUnique({
      where: { id: mtpSessionId },
      include: { patient: { select: { id: true, name: true, uhid: true } } },
    });
    if (!mtp) throw new NotFoundException("MTP session not found");
    if (String(mtp.status).toUpperCase() !== "ACTIVE") {
      throw new BadRequestException("MTP session is not ACTIVE");
    }

    const bid = this.ctx.resolveBranchId(principal, dto.branchId ?? mtp.branchId);

    const ratio = mtp.packRatio && typeof mtp.packRatio === "object" ? (mtp.packRatio as any) : {};
    const prbcUnits = Math.max(0, Number(dto.prbcUnits ?? ratio?.prbc ?? 4) || 0);
    const ffpUnits = Math.max(0, Number(dto.ffpUnits ?? ratio?.ffp ?? 4) || 0);
    const plateletUnits = Math.max(0, Number(dto.plateletUnits ?? ratio?.sdp ?? ratio?.platelet ?? 0) || 0);

    if (prbcUnits + ffpUnits + plateletUnits < 1) {
      throw new BadRequestException("At least one unit must be requested for release");
    }

    const startedAt = Date.now();

    const result = await this.ctx.prisma.$transaction(async (tx: any) => {
      // Allocate units (reserve first)
      const prbc = await this.allocateEmergencyUnits(tx, {
        branchId: bid,
        componentType: "PRBC",
        bloodGroups: ["O_NEG"],
        quantity: prbcUnits,
      });

      const ffp = await this.allocateEmergencyUnits(tx, {
        branchId: bid,
        componentType: "FFP",
        bloodGroups: ["AB_NEG", "AB_POS"],
        quantity: ffpUnits,
      });

      let plts: any[] = [];
      if (plateletUnits > 0) {
        // Prefer SDP then RDP; both are acceptable for emergency issue.
        const sdp = await this.allocateEmergencyUnits(tx, {
          branchId: bid,
          componentType: "PLATELET_SDP",
          bloodGroups: ["O_NEG", "O_POS", "A_NEG", "A_POS", "B_NEG", "B_POS", "AB_NEG", "AB_POS"],
          quantity: Math.min(plateletUnits, 250),
        });
        const rem = plateletUnits - sdp.length;
        const rdp = rem > 0
          ? await this.allocateEmergencyUnits(tx, {
            branchId: bid,
            componentType: "PLATELET_RDP",
            bloodGroups: ["O_NEG", "O_POS", "A_NEG", "A_POS", "B_NEG", "B_POS", "AB_NEG", "AB_POS"],
            quantity: rem,
          })
          : [];
        plts = [...sdp, ...rdp];
      }

      // Create component-level requests (traceability)
      const mkReqNo = () => `BR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const mkIssueNo = () => `BI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const requests: Array<{ component: string; requestId: string; requestNumber: string; qty: number }> = [];

      const prbcReq = prbc.length
        ? await tx.bloodRequest.create({
          data: {
            branchId: bid,
            requestNumber: mkReqNo(),
            patientId: mtp.patientId,
            encounterId: mtp.encounterId,
            requestedComponent: "PRBC",
            quantityUnits: prbc.length,
            urgency: "MTP",
            status: "ISSUED",
            slaTargetMinutes: 5,
            notes: dto.notes ? String(dto.notes) : "MTP emergency uncrossmatched pack (PRBC)",
            requestedByStaffId: this.actorStaffId(principal),
          },
          select: { id: true, requestNumber: true },
        })
        : null;
      if (prbcReq) requests.push({ component: "PRBC", requestId: prbcReq.id, requestNumber: prbcReq.requestNumber, qty: prbc.length });

      const ffpReq = ffp.length
        ? await tx.bloodRequest.create({
          data: {
            branchId: bid,
            requestNumber: mkReqNo(),
            patientId: mtp.patientId,
            encounterId: mtp.encounterId,
            requestedComponent: "FFP",
            quantityUnits: ffp.length,
            urgency: "MTP",
            status: "ISSUED",
            slaTargetMinutes: 5,
            notes: dto.notes ? String(dto.notes) : "MTP emergency uncrossmatched pack (FFP)",
            requestedByStaffId: this.actorStaffId(principal),
          },
          select: { id: true, requestNumber: true },
        })
        : null;
      if (ffpReq) requests.push({ component: "FFP", requestId: ffpReq.id, requestNumber: ffpReq.requestNumber, qty: ffp.length });

      const pltReq = plts.length
        ? await tx.bloodRequest.create({
          data: {
            branchId: bid,
            requestNumber: mkReqNo(),
            patientId: mtp.patientId,
            encounterId: mtp.encounterId,
            requestedComponent: plts[0]?.componentType ?? "PLATELET_SDP",
            quantityUnits: plts.length,
            urgency: "MTP",
            status: "ISSUED",
            slaTargetMinutes: 5,
            notes: dto.notes ? String(dto.notes) : "MTP emergency uncrossmatched pack (PLT)",
            requestedByStaffId: this.actorStaffId(principal),
          },
          select: { id: true, requestNumber: true },
        })
        : null;
      if (pltReq) requests.push({ component: "PLT", requestId: pltReq.id, requestNumber: pltReq.requestNumber, qty: plts.length });

      // Create issues + mark units as ISSUED
      const issued: any[] = [];
      const makeIssue = async (unit: any, requestId: string) => {
        // RESERVED -> ISSUED (safe)
        await tx.bloodUnit.update({ where: { id: unit.id }, data: { status: "ISSUED" } });
        const issue = await tx.bloodIssue.create({
          data: {
            branchId: bid,
            issueNumber: mkIssueNo(),
            bloodUnitId: unit.id,
            requestId,
            crossMatchId: null,
            issuedToPerson: dto.issuedToPerson ? String(dto.issuedToPerson) : null,
            issuedToWard: dto.issuedToWard ? String(dto.issuedToWard) : null,
            transportBoxTemp: (dto.transportBoxTemp as any) ?? null,
            issuedByStaffId: this.actorStaffId(principal),
            inspectionNotes: "MTP EMERGENCY UNCROSSMATCHED RELEASE",
            isEmergencyIssue: true,
            mtpSessionId: mtp.id,
          },
          include: { bloodUnit: { select: { id: true, unitNumber: true, bloodGroup: true, componentType: true } } },
        });
        issued.push(issue);
      };

      if (prbcReq) for (const u of prbc) await makeIssue(u, prbcReq.id);
      if (ffpReq) for (const u of ffp) await makeIssue(u, ffpReq.id);
      if (pltReq) for (const u of plts) await makeIssue(u, pltReq.id);

      return { mtpId: mtp.id, patientId: mtp.patientId, requests, issues: issued };
    });

    const elapsedMs = Date.now() - startedAt;

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_MTP_PACK_RELEASED",
      entity: "MTPSession",
      entityId: mtp.id,
      meta: {
        prbcUnits, ffpUnits, plateletUnits,
        elapsedMs,
        issuedToWard: dto.issuedToWard ?? null,
        issuedToPerson: dto.issuedToPerson ?? null,
        transportBoxTemp: dto.transportBoxTemp ?? null,
      },
    });

    for (const issue of result.issues ?? []) {
      await this.ctx.audit.log({
        branchId: bid,
        actorUserId: principal.userId,
        action: "BB_BLOOD_ISSUED",
        entity: "BloodIssue",
        entityId: issue.id,
        meta: {
          mtpId: mtp.id,
          emergencyRelease: true,
          unitId: issue.bloodUnit?.id ?? issue.bloodUnitId,
          unitNumber: issue.bloodUnit?.unitNumber,
          bloodGroup: issue.bloodUnit?.bloodGroup,
          componentType: issue.bloodUnit?.componentType,
          requestId: issue.requestId,
        },
      });
    }

    return {
      mtpId: result.mtpId,
      patient: mtp.patient,
      requests: result.requests,
      issues: (result.issues ?? []).map((i: any) => ({
        id: i.id,
        issueNumber: i.issueNumber,
        unitId: i.bloodUnit?.id ?? i.bloodUnitId,
        unitNumber: i.bloodUnit?.unitNumber ?? null,
        componentType: i.bloodUnit?.componentType ?? null,
        bloodGroup: i.bloodUnit?.bloodGroup ?? null,
        issuedAt: i.issuedAt,
      })),
      elapsedMs,
    };
  }

  async deactivateMTP(principal: Principal, id: string) {
    const mtp = await this.ctx.prisma.mTPSession.findUnique({ where: { id } });
    if (!mtp) throw new NotFoundException("MTP session not found");
    const bid = this.ctx.resolveBranchId(principal, mtp.branchId);

    const result = await this.ctx.prisma.mTPSession.update({
      where: { id },
      data: { status: "DEACTIVATED", deactivatedAt: new Date(), deactivatedByStaffId: this.actorStaffId(principal) },
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

private deriveIssueStatus(issue: {
  isReturned: boolean;
  returnedAt: Date | null;
  transfusionRecord: { startedAt: Date | null; endedAt: Date | null; hasReaction?: boolean | null } | null;
  bloodUnit: { status: string } | null;
}): string {
  if (issue.isReturned || issue.returnedAt || issue.bloodUnit?.status === "RETURNED") return "RETURNED";
  if (issue.transfusionRecord?.hasReaction) return "REACTION";
  if (issue.transfusionRecord?.endedAt || issue.bloodUnit?.status === "TRANSFUSED") return "COMPLETED";
  if (issue.transfusionRecord?.startedAt) return "ACTIVE";
  if (issue.bloodUnit?.status === "DISCARDED") return "DISCARDED";
  if (issue.bloodUnit?.status) return issue.bloodUnit.status;
  return "ISSUED";
}


  private normalizeDecimal(value: unknown): number | string | null {
    if (value == null) return null;
    if (typeof value === "number" || typeof value === "string") return value;
    const numeric = Number(value as any);
    if (Number.isFinite(numeric)) return numeric;
    return String(value);
  }
}
