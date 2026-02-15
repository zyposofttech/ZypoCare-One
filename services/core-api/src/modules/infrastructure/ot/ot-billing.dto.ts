import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateServiceLinkDto {
  @IsString() @IsNotEmpty() serviceItemId!: string;
  @IsString() @IsNotEmpty() specialtyCode!: string;
  @IsString() @IsNotEmpty() surgeryCategory!: string; // OtSurgeryCategory
  @IsOptional() @IsString() defaultTheatreType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredEquipmentCategories?: string[];
  @IsOptional() @IsString() snomedCode?: string;
  @IsOptional() @IsString() icd10PcsCode?: string;
}

export class CreateChargeComponentDto {
  @IsString() @IsNotEmpty() componentType!: string; // OtChargeComponentType
  @IsString() @IsNotEmpty() chargeModel!: string; // OtChargeModel
  @IsOptional() @IsString() serviceItemId?: string;
  @IsOptional() @IsString() glCode?: string;
  @IsOptional() @IsBoolean() gstApplicable?: boolean;
  @IsOptional() @IsNumber() defaultRate?: number;
}

export class UpdateChargeComponentDto {
  @IsOptional() @IsString() chargeModel?: string;
  @IsOptional() @IsString() serviceItemId?: string;
  @IsOptional() @IsString() glCode?: string;
  @IsOptional() @IsBoolean() gstApplicable?: boolean;
  @IsOptional() @IsNumber() defaultRate?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
