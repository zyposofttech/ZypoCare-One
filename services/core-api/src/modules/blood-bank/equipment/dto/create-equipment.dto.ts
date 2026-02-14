import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

const EQUIPMENT_TYPES = ["BLOOD_BANK_FRIDGE", "PLATELET_AGITATOR", "PLASMA_FREEZER", "CENTRIFUGE", "BLOOD_WARMER", "TUBE_SEALER", "CELL_WASHER", "IRRADIATOR", "OTHER"] as const;

export class CreateEquipmentDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() name!: string;
  @IsIn(EQUIPMENT_TYPES as any) equipmentType!: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() minTemp?: number;
  @IsOptional() @IsNumber() maxTemp?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() lastCalibrationDate?: string;
  @IsOptional() @IsString() nextCalibrationDate?: string;
}
