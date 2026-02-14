import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateReagentDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() reagentType?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() lotNumber?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsInt() @Min(0) currentStock?: number;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
}
