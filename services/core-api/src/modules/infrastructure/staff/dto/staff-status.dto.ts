import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class StaffSuspendDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  // Optional suspension window (for audits / planned suspensions)
  @IsOptional()
  @IsISO8601()
  suspendedFrom?: string;

  @IsOptional()
  @IsISO8601()
  suspendedTo?: string;
}

export class StaffOffboardDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
