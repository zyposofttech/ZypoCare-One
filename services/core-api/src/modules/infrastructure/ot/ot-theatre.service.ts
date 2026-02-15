import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";

import {
  UpdateTheatreEngineeringDto,
  UpdateTheatreSchedulingParamsDto,
  UpdateTheatreSpecialtiesDto,
} from "./ot-theatre.dto";

@Injectable()
export class OtTheatreService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private async getTheatreWithAuth(principal: Principal, theatreId: string) {
    const theatre = await this.prisma.otTheatre.findUnique({
      where: { id: theatreId },
      include: { space: { include: { suite: { select: { branchId: true } } } } },
    });
    if (!theatre) throw new NotFoundException("Theatre not found");
    return theatre;
  }

  async updateEngineeringSpecs(principal: Principal, theatreId: string, dto: UpdateTheatreEngineeringDto) {
    await this.getTheatreWithAuth(principal, theatreId);

    return this.prisma.otTheatre.update({
      where: { id: theatreId },
      data: {
        area: dto.area,
        ceilingHeight: dto.ceilingHeight,
        gasO2: dto.gasO2,
        gasO2Outlets: dto.gasO2Outlets,
        gasN2O: dto.gasN2O,
        gasN2OOutlets: dto.gasN2OOutlets,
        gasAir: dto.gasAir,
        gasAirOutlets: dto.gasAirOutlets,
        gasVacuum: dto.gasVacuum,
        gasVacuumOutlets: dto.gasVacuumOutlets,
        upsOutlets: dto.upsOutlets,
        isolatedPowerSupply: dto.isolatedPowerSupply,
        tempMin: dto.tempMin,
        tempMax: dto.tempMax,
        humidityMin: dto.humidityMin,
        humidityMax: dto.humidityMax,
        luxLevel: dto.luxLevel,
        emergencyLighting: dto.emergencyLighting,
        isoClass: dto.isoClass,
        airflow: dto.airflow as any,
        pressure: dto.pressure as any,
        theatreType: dto.theatreType as any,
      },
    });
  }

  async updateSpecialties(principal: Principal, theatreId: string, dto: UpdateTheatreSpecialtiesDto) {
    await this.getTheatreWithAuth(principal, theatreId);

    return this.prisma.otTheatre.update({
      where: { id: theatreId },
      data: { specialtyCodes: dto.specialtyCodes },
    });
  }

  async updateSchedulingParams(principal: Principal, theatreId: string, dto: UpdateTheatreSchedulingParamsDto) {
    await this.getTheatreWithAuth(principal, theatreId);

    return this.prisma.otTheatre.update({
      where: { id: theatreId },
      data: {
        turnaroundTimeMin: dto.turnaroundTimeMin,
        cleaningTimeMin: dto.cleaningTimeMin,
        maxCasesPerDay: dto.maxCasesPerDay,
        defaultSlotMinor: dto.defaultSlotMinor,
        defaultSlotMajor: dto.defaultSlotMajor,
        defaultSlotComplex: dto.defaultSlotComplex,
        bufferEmergencyMin: dto.bufferEmergencyMin,
        isEmergencyEligible: dto.isEmergencyEligible,
        is24x7Emergency: dto.is24x7Emergency,
      },
    });
  }

  async getVersionHistory(_principal: Principal, theatreId: string) {
    const theatre = await this.prisma.otTheatre.findUnique({
      where: { id: theatreId },
      include: { space: { select: { suite: { select: { branchId: true } } } } },
    });
    if (!theatre) throw new NotFoundException("Theatre not found");

    // Return the current state as a snapshot — full version history can be
    // implemented via an audit log or temporal table later.
    return {
      theatreId,
      currentVersion: {
        theatreType: theatre.theatreType,
        airflow: theatre.airflow,
        pressure: theatre.pressure,
        isoClass: theatre.isoClass,
        specialtyCodes: theatre.specialtyCodes,
        updatedAt: theatre.updatedAt,
      },
    };
  }
}
