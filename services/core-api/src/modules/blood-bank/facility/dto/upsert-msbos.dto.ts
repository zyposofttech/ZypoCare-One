import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpsertMSBOSDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() procedureCode?: string;
  @IsOptional() @IsString() procedureName?: string;
  @IsOptional() @IsInt() @Min(0) recommendedPRBC?: number;
  @IsOptional() @IsInt() @Min(0) recommendedFFP?: number;
  @IsOptional() @IsInt() @Min(0) recommendedPlatelet?: number;
}
