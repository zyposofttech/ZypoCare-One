import { IsIn, IsOptional, IsString } from "class-validator";

const BLOOD_GROUPS = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "BOMBAY", "RARE_OTHER"] as const;
const DONOR_TYPES = ["VOLUNTARY", "REPLACEMENT", "DIRECTED", "AUTOLOGOUS"] as const;

export class CreateDonorDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() name!: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsIn(BLOOD_GROUPS as any) bloodGroup?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() aadhaarNo?: string;
  @IsOptional() @IsIn(DONOR_TYPES as any) donorType?: string;
  @IsOptional() @IsString() patientId?: string;
}
