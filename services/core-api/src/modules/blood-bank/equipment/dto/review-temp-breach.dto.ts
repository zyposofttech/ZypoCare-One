import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class ReviewTempBreachDto {
  /**
   * RELEASE: restore quarantined units (set to AVAILABLE)
   * DISCARD: discard quarantined units (set to DISCARDED and remove from slot)
   */
  @IsIn(["RELEASE", "DISCARD"] as const)
  action!: "RELEASE" | "DISCARD";

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unitIds?: string[];

  // Defaults to true
  @IsOptional()
  @IsBoolean()
  acknowledgeIfNeeded?: boolean;

  // Defaults to true
  @IsOptional()
  @IsBoolean()
  requireRecoveryLog?: boolean;
}
    