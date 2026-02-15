import { IsBoolean, IsOptional, IsString } from "class-validator";

export class StartTransfusionDto {
  @IsOptional() vitals?: any;

  @IsOptional() @IsString() verifiedBy?: string;
  @IsOptional() @IsString() startNotes?: string;

  /**
   * PRD S9 (Allergy/Reaction hard-stop):
   * If patient has a serious prior reaction, starting transfusion requires an explicit override.
   */
  @IsOptional() @IsBoolean() highRiskOverride?: boolean;
  @IsOptional() @IsString() highRiskOverrideReason?: string;
}
