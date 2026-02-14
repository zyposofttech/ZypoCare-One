import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateComponentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsInt() @Min(1) shelfLifeDays?: number;
  @IsOptional() @IsNumber() storageMinTemp?: number;
  @IsOptional() @IsNumber() storageMaxTemp?: number;
  @IsOptional() @IsNumber() minVolumeMl?: number;
  @IsOptional() @IsNumber() maxVolumeMl?: number;
  @IsOptional() @IsString() preparationMethod?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
