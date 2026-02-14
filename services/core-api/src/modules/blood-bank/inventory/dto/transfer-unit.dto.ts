import { IsOptional, IsString } from "class-validator";

export class TransferUnitDto {
  @IsString() unitId!: string;
  @IsString() targetBranchId!: string;
  @IsOptional() @IsString() notes?: string;
}
