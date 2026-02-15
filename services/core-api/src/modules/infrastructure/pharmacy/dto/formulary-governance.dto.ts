import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMinSize,
} from "class-validator";

export class CreateFormularyCommitteeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  /**
   * Optional: seed members right away
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberUserIds?: string[];

  @IsOptional()
  @IsString()
  chairUserId?: string;
}

export class UpdateFormularyCommitteeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpsertCommitteeMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds!: string[];

  @IsOptional()
  @IsIn(["CHAIR", "MEMBER", "SECRETARY"])
  role?: string;
}

export class UpdateFormularyPolicyDto {
  /**
   * Optional committee binding
   */
  @IsOptional()
  @IsString()
  committeeId?: string | null;

  /**
   * Store approver role codes (strings) for downstream enforcement.
   * Keep flexible; enforcement happens in CPOE/Dispense.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedApproverRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nonFormularyApproverRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reserveAntibioticApproverRoles?: string[];

  @IsOptional()
  config?: any; // additional policy switches (JSON)
}
