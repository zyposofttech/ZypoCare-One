import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

// ────────────────────────────── Templates ──────────────────────────────

export class CreateNabhTemplateDto {
  @IsString()
  orgId!: string;

  @IsString()
  @MaxLength(200)
  name!: string;
}

export class CreateNabhTemplateItemDto {
  @IsString()
  templateId!: string;

  @IsString()
  @MaxLength(100)
  chapter!: string;

  @IsString()
  @MaxLength(30)
  standardCode!: string;

  @IsString()
  @MaxLength(30)
  meCode!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  evidenceRequired?: boolean;

  @IsEnum(["CRITICAL", "MAJOR", "MINOR"])
  @IsOptional()
  riskLevel?: "CRITICAL" | "MAJOR" | "MINOR";
}

// ────────────────────────────── Workspace Items ──────────────────────────────

export class UpdateNabhItemDto {
  @IsEnum(["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED", "NON_COMPLIANT"])
  @IsOptional()
  status?: "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED" | "NON_COMPLIANT";

  @IsString()
  @IsOptional()
  ownerStaffId?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;

  @IsEnum(["CRITICAL", "MAJOR", "MINOR"])
  @IsOptional()
  riskLevel?: "CRITICAL" | "MAJOR" | "MINOR";
}

// ────────────────────────────── Audit Cycles ──────────────────────────────

export class CreateAuditCycleDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  auditorStaffIds?: string[];
}

export class UpdateAuditCycleDto {
  @IsEnum(["PLANNED", "IN_PROGRESS", "CLOSED"])
  @IsOptional()
  status?: "PLANNED" | "IN_PROGRESS" | "CLOSED";

  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

// ────────────────────────────── Findings ──────────────────────────────

export class CreateFindingDto {
  @IsString()
  auditId!: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsEnum(["CRITICAL", "MAJOR", "MINOR"])
  severity!: "CRITICAL" | "MAJOR" | "MINOR";

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  recommendedAction?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateFindingDto {
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  recommendedAction?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;
}

// ────────────────────────────── CAPA ──────────────────────────────

export class CreateCapaDto {
  @IsString()
  findingId!: string;

  @IsString()
  ownerStaffId!: string;

  @IsString()
  dueDate!: string;

  @IsString()
  @MaxLength(4000)
  actionPlan!: string;
}

export class UpdateCapaDto {
  @IsEnum(["OPEN", "IN_PROGRESS", "CLOSED"])
  @IsOptional()
  status?: "OPEN" | "IN_PROGRESS" | "CLOSED";

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  closureNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  actionPlan?: string;
}
