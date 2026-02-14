import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateEquipmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() minTemp?: number;
  @IsOptional() @IsNumber() maxTemp?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() lastCalibrationDate?: string;
  @IsOptional() @IsString() nextCalibrationDate?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
