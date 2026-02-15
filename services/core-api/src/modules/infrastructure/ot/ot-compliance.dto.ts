import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateChecklistTemplateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() phase!: string; // OtChecklistPhase
  @IsString() @IsNotEmpty() templateType!: string; // WHO, PRE_OP, CONSENT, SPECIALTY
  @IsObject() items!: any; // JSON array
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsBoolean() isSystem?: boolean;
}

export class UpdateChecklistTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phase?: string;
  @IsOptional() @IsString() templateType?: string;
  @IsOptional() @IsObject() items?: any;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateComplianceConfigDto {
  @IsString() @IsNotEmpty() configType!: string; // OtComplianceConfigType
  @IsObject() config!: any; // Type-specific settings
  @IsOptional() @IsString() lastAuditAt?: string;
  @IsOptional() @IsString() nextAuditDue?: string;
}

export class UpdateComplianceConfigDto {
  @IsOptional() @IsObject() config?: any;
  @IsOptional() @IsString() lastAuditAt?: string;
  @IsOptional() @IsString() nextAuditDue?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
