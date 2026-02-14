import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class RecordEQASDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() testSystem!: string;
  @IsOptional() @IsString() qcLevel?: string;
  @IsOptional() @IsNumber() observedValue?: number;
  @IsOptional() @IsNumber() expectedValue?: number;
  @IsOptional() @IsBoolean() westgardPass?: boolean;
  @IsOptional() @IsString() eqasProvider?: string;
  @IsOptional() @IsString() eqasCycleId?: string;
  @IsOptional() @IsString() recordDate?: string;
  @IsOptional() @IsString() notes?: string;
}
