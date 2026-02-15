import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateReportRunDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  reportType!: string;

  @IsOptional()
  @IsObject()
  parameters?: any;
}
