import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpsertOrderSetItemDto {
  @IsString()
  serviceItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @IsOptional()
  rules?: any;
}
