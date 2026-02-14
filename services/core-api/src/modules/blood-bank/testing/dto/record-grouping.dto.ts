import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

const BLOOD_GROUPS = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "BOMBAY", "RARE_OTHER"] as const;

export class RecordGroupingDto {
  @IsString() unitId!: string;
  @IsOptional() aboForward?: any;
  @IsOptional() aboReverse?: any;
  @IsOptional() rhTyping?: any;
  @IsOptional() @IsString() antibodyScreen?: string;
  @IsOptional() @IsIn(BLOOD_GROUPS as any) confirmedBloodGroup?: string;
  @IsOptional() @IsBoolean() hasDiscrepancy?: boolean;
  @IsOptional() @IsString() discrepancyNotes?: string;
}
