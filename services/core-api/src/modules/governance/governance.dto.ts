import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsRFC3339, IsString, MaxLength } from "class-validator";

export class CreatePolicyDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}


export class UpdatePolicyDraftDto {
  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  // ISO datetime string
  @IsOptional()
  @IsRFC3339()
  effectiveAt?: string;

  // GLOBAL policy rollout controls
  @IsOptional()
  @IsBoolean()
  applyToAllBranches?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];
}

export class ApprovePolicyVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class RejectPolicyVersionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
