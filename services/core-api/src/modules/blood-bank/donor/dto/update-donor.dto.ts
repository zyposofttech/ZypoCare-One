import { IsIn, IsOptional, IsString } from "class-validator";

const BLOOD_GROUPS = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", "BOMBAY", "RARE_OTHER"] as const;

export class UpdateDonorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsIn(BLOOD_GROUPS as any) bloodGroup?: string;
}
