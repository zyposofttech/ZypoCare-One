import { IsIn, IsOptional, IsString } from "class-validator";

const METHODS = ["IMMEDIATE_SPIN", "AHG_INDIRECT_COOMBS", "ELECTRONIC"] as const;
const RESULTS = ["COMPATIBLE", "INCOMPATIBLE", "PENDING"] as const;

export class RecordCrossMatchDto {
  @IsString() unitId!: string;
  @IsOptional() @IsIn(METHODS as any) method?: string;
  @IsOptional() @IsIn(RESULTS as any) result?: string;
}
