import { IsIn, IsOptional, IsString } from "class-validator";

const TTI_RESULTS = ["REACTIVE", "NON_REACTIVE", "INDETERMINATE", "PENDING"] as const;

export class RecordTTIDto {
  @IsString() unitId!: string;
  @IsString() testName!: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() kitLotNumber?: string;
  @IsOptional() @IsIn(TTI_RESULTS as any) result?: string;
}
