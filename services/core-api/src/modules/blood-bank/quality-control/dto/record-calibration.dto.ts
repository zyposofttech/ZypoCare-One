import { IsOptional, IsString } from "class-validator";

export class RecordCalibrationDto {
  @IsString() equipmentId!: string;
  @IsOptional() @IsString() nextCalibrationDate?: string;
  @IsOptional() @IsString() notes?: string;
}
