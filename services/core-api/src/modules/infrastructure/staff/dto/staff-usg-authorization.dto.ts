import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class StaffUsgAuthorizationDto {
  @IsBoolean()
  isUsgAuthorized!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}
