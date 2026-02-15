import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export enum DiagnosticServicePointType {
  LAB = "LAB",
  RADIOLOGY = "RADIOLOGY",
  CARDIO_DIAGNOSTICS = "CARDIO_DIAGNOSTICS",
  NEURO_DIAGNOSTICS = "NEURO_DIAGNOSTICS",
  PULMONARY_DIAGNOSTICS = "PULMONARY_DIAGNOSTICS",
  ENDOSCOPY = "ENDOSCOPY",
  OTHER = "OTHER",
}

export class ListServicePointsQuery {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsOptional()
  @IsEnum(DiagnosticServicePointType)
  type?: DiagnosticServicePointType;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateServicePointDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  // mandatory
  @IsString()
  @IsNotEmpty()
  locationNodeId!: string;

  // optional link to infra unit
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(DiagnosticServicePointType)
  type?: DiagnosticServicePointType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  operatingHours?: any;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  capacity?: number;
}

export class UpdateServicePointDto {
  @IsOptional()
  @IsString()
  branchId?: string; // for guard checks only

  @IsOptional()
  @IsString()
  locationNodeId?: string;

  @IsOptional()
  @IsString()
  unitId?: string | null;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DiagnosticServicePointType)
  type?: DiagnosticServicePointType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  operatingHours?: any;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  capacity?: number | null;
}
