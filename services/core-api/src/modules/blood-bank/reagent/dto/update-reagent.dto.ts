import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateReagentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() lotNumber?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsInt() @Min(0) currentStock?: number;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
