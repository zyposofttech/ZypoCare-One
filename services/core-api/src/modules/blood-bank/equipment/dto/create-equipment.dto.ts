import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

// IMPORTANT: Must match enum BBEquipmentType in schema.prisma
const EQUIPMENT_TYPES = [
  "REFRIGERATOR",
  "DEEP_FREEZER",
  "PLATELET_AGITATOR",
  "CELL_SEPARATOR",
  "BLOOD_WARMER",
  "CENTRIFUGE",
  "OTHER",
] as const;

export class CreateEquipmentDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() name!: string;
  @IsIn(EQUIPMENT_TYPES as any) equipmentType!: string;

  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;

  @IsOptional() @IsNumber() capacity?: number;

  // Storage range
  @IsOptional() @IsNumber() minTemp?: number;
  @IsOptional() @IsNumber() maxTemp?: number;

  // Alarm thresholds (if omitted, tempRange values are used)
  @IsOptional() @IsNumber() alarmMinTemp?: number;
  @IsOptional() @IsNumber() alarmMaxTemp?: number;

  // IoT / polling
  @IsOptional() @IsString() iotSensorId?: string;
  @IsOptional() @IsInt() @Min(30) pollingIntervalSec?: number;

  // Calibration
  @IsOptional() @IsInt() @Min(1) calibrationIntervalDays?: number;

  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() lastCalibrationDate?: string;
  @IsOptional() @IsString() nextCalibrationDate?: string;
}
