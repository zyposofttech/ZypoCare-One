import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

// ------------------------------------------------------------------ enums ---

const SCHEME_VALUES = ["PMJAY", "CGHS", "ECHS", "STATE_SCHEME", "OTHER"] as const;
type SchemeType = (typeof SCHEME_VALUES)[number];

const CITY_CATEGORY_VALUES = ["A", "B", "C"] as const;
type CityCategory = (typeof CITY_CATEGORY_VALUES)[number];

const EMPANELMENT_STATUS_VALUES = ["DRAFT", "ACTIVE", "SUSPENDED"] as const;
type EmpanelmentStatus = (typeof EMPANELMENT_STATUS_VALUES)[number];

// ------------------------------------------------------- Empanelment DTOs ---

export class CreateEmpanelmentDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(SCHEME_VALUES)
  scheme!: SchemeType;

  @IsString()
  @MaxLength(100)
  empanelmentNumber!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shaCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @IsEnum(CITY_CATEGORY_VALUES)
  @IsOptional()
  cityCategory?: CityCategory;

  @IsEnum(EMPANELMENT_STATUS_VALUES)
  @IsOptional()
  status?: EmpanelmentStatus;
}

export class UpdateEmpanelmentDto {
  @IsEnum(SCHEME_VALUES)
  @IsOptional()
  scheme?: SchemeType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  empanelmentNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shaCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @IsEnum(CITY_CATEGORY_VALUES)
  @IsOptional()
  cityCategory?: CityCategory;

  @IsEnum(EMPANELMENT_STATUS_VALUES)
  @IsOptional()
  status?: EmpanelmentStatus;
}

// --------------------------------------------------------- RateCard DTOs ---

export class CreateRateCardDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(SCHEME_VALUES)
  scheme!: SchemeType;

  @IsString()
  @MaxLength(50)
  version!: string;

  @IsString()
  effectiveFrom!: string;

  @IsString()
  @IsOptional()
  effectiveTo?: string;
}

export class UpdateRateCardDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

  @IsString()
  @IsOptional()
  effectiveFrom?: string;

  @IsString()
  @IsOptional()
  effectiveTo?: string;
}

// ----------------------------------------------------- RateCardItem DTOs ---

export class UpdateRateCardItemDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  rate?: number;

  @IsString()
  @IsOptional()
  inclusions?: string;

  @IsString()
  @IsOptional()
  exclusions?: string;
}

// ---------------------------------------------------------- Mapping DTOs ---

export class CreateMappingDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(SCHEME_VALUES)
  scheme!: SchemeType;

  @IsString()
  @MaxLength(100)
  externalCode!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  externalName?: string;

  @IsString()
  @IsOptional()
  internalServiceId?: string;

  @IsString()
  @IsOptional()
  internalTariffItemId?: string;

  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;
}

export class UpdateMappingDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  externalName?: string;

  @IsString()
  @IsOptional()
  internalServiceId?: string;

  @IsString()
  @IsOptional()
  internalTariffItemId?: string;

  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;
}
