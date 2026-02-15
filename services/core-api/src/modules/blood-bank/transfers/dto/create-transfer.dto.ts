import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTransferDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  toBranchId!: string;

  @IsArray()
  unitIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
