import { IsOptional, IsString, MaxLength } from "class-validator";

export class StaffMergePreviewDto {
  @IsString()
  sourceStaffId!: string;

  @IsString()
  targetStaffId!: string;
}

export class StaffMergeDto extends StaffMergePreviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
