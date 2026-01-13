import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Inject,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";
import type { PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import { Roles } from "../auth/roles.decorator";

class CreateServiceDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() unit?: string;
}

class CreateTariffPlanDto {
  @IsString() branchId!: string;

  // Required by schema (we allow optional input but always persist something)
  @IsOptional() @IsString() code?: string;

  @IsString() name!: string;

  // Required by schema (we allow optional input but default to ACTIVE)
  @IsOptional() @IsString() status?: string;

  @IsString() payerType!: string;

  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
}

class UpsertRateDto {
  @IsString() tariffPlanId!: string;
  @IsString() serviceCode!: string;
  @IsNumber() amount!: number;
}

function parseDateOrThrow(value: string, fieldName: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${fieldName}`);
  return d;
}

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  @Roles("BRANCH_ADMIN", "BILLING", "SUPER_ADMIN")
  @Get("services")
  async listServices(@Query("q") q?: string) {
    const query = (q ?? "").trim();
    return this.prisma.serviceCatalogItem.findMany({
      where: query
        ? {
            OR: [
              { code: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 200,
    });
  }

  @Roles("BRANCH_ADMIN", "BILLING", "SUPER_ADMIN")
  @Post("services")
  async createService(@Body() dto: CreateServiceDto) {
    const code = dto.code.trim();
    const name = dto.name.trim();
    const category = dto.category.trim();

    if (!code || !name || !category) {
      throw new BadRequestException("code, name, category are required");
    }

    try {
      const item = await this.prisma.serviceCatalogItem.create({
        data: {
          code,
          name,
          category,
          unit: dto.unit?.trim() || null,
        },
      });

      await this.audit.log({
        action: "SERVICE_CREATE",
        entity: "ServiceCatalogItem",
        entityId: item.id,
        meta: { code, name, category },
      });

      return item;
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        throw new ConflictException("Service code already exists");
      }
      throw e;
    }
  }

  @Roles("BRANCH_ADMIN", "BILLING", "SUPER_ADMIN")
  @Get("tariffs")
  async listTariffs(@Query("branchId") branchId?: string) {
    return this.prisma.tariffPlan.findMany({
      where: branchId ? { branchId } : {},
      include: { rates: true },
      orderBy: { effectiveFrom: "desc" },
      take: 200,
    });
  }

  @Roles("BRANCH_ADMIN", "BILLING", "SUPER_ADMIN")
  @Post("tariffs")
  async createTariff(@Body() dto: CreateTariffPlanDto) {
    const branchId = dto.branchId.trim();
    const name = dto.name.trim();
    const payerType = dto.payerType.trim();

    if (!branchId || !name || !payerType) {
      throw new BadRequestException("branchId, name, payerType are required");
    }

    const effectiveFrom = parseDateOrThrow(dto.effectiveFrom, "effectiveFrom");
    const effectiveTo = dto.effectiveTo ? parseDateOrThrow(dto.effectiveTo, "effectiveTo") : null;

    // Schema requires code + status
    const code = (dto.code?.trim() || `TP-${Date.now()}`).slice(0, 64);
    const status = (dto.status?.trim() || "ACTIVE").slice(0, 32);

    try {
      const plan = await this.prisma.tariffPlan.create({
        data: {
          branchId,
          code,
          name,
          status,
          payerType,
          effectiveFrom,
          effectiveTo,
        },
        include: { rates: true },
      });

      await this.audit.log({
        branchId,
        action: "TARIFF_PLAN_CREATE",
        entity: "TariffPlan",
        entityId: plan.id,
        meta: { branchId, code, name, status, payerType, effectiveFrom, effectiveTo },
      });

      return plan;
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        // likely @@unique([branchId, code])
        throw new ConflictException("Tariff plan code already exists for this branch");
      }
      throw e;
    }
  }

  @Roles("BRANCH_ADMIN", "BILLING", "SUPER_ADMIN")
  @Post("tariffs/rates")
  async upsertRate(@Body() dto: UpsertRateDto) {
    const tariffPlanId = dto.tariffPlanId.trim();
    const serviceCode = dto.serviceCode.trim();

    if (!tariffPlanId || !serviceCode) {
      throw new BadRequestException("tariffPlanId and serviceCode are required");
    }

    const rate = await this.prisma.tariffRate.upsert({
      where: {
        tariffPlanId_serviceCode: { tariffPlanId, serviceCode },
      },
      update: { amount: dto.amount as any },
      create: { tariffPlanId, serviceCode, amount: dto.amount as any },
    });

    await this.audit.log({
      action: "TARIFF_RATE_UPSERT",
      entity: "TariffRate",
      entityId: rate.id,
      meta: { tariffPlanId, serviceCode, amount: dto.amount },
    });

    return rate;
  }
}
