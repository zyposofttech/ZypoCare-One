import { IsIn, IsOptional, IsString } from "class-validator";

const DISCARD_REASONS = ["EXPIRED", "TTI_REACTIVE", "BAG_LEAK", "CLOT", "LIPEMIC", "HEMOLYZED", "QC_FAILURE", "RETURN_TIMEOUT", "OTHER"] as const;

export class DiscardUnitDto {
  @IsString() unitId!: string;
  @IsIn(DISCARD_REASONS as any) reason!: string;
  @IsOptional() @IsString() notes?: string;
}
