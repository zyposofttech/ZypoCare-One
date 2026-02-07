import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ExpiryQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsBoolean()
  includeExpired?: boolean;
}
