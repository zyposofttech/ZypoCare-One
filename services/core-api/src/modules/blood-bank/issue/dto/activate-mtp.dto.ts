import { IsOptional, IsString } from "class-validator";

export class ActivateMTPDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() patientId!: string;
  @IsOptional() @IsString() encounterId?: string;
  @IsOptional() @IsString() clinicalIndication?: string;
}
