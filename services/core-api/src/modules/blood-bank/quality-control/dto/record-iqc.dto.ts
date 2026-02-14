import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class RecordIQCDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() testSystem!: string;
  @IsOptional() @IsString() qcLevel?: string;
  @IsOptional() @IsNumber() observedValue?: number;
  @IsOptional() @IsNumber() expectedValue?: number;
  @IsOptional() @IsNumber() sdValue?: number;
  @IsOptional() @IsBoolean() westgardPass?: boolean;
  @IsOptional() @IsString() westgardViolation?: string;
  @IsOptional() @IsString() recordDate?: string;
  @IsOptional() @IsString() notes?: string;
}
