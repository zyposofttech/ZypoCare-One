import { IsIn, IsOptional, IsString } from "class-validator";

export class DeferDonorDto {
  @IsString() reason!: string;
  @IsIn(["TEMPORARY", "PERMANENT"]) deferralType!: string;
  @IsOptional() @IsString() endDate?: string;
}
