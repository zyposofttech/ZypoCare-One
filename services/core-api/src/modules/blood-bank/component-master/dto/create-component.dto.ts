import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

const COMPONENT_TYPES = ["WHOLE_BLOOD", "PRBC", "FFP", "PLATELET_RDP", "PLATELET_SDP", "CRYOPRECIPITATE", "CRYO_POOR_PLASMA"] as const;

export class CreateComponentDto {
  @IsOptional() @IsString() branchId?: string;
  @IsIn(COMPONENT_TYPES as any) componentType!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsInt() @Min(1) shelfLifeDays!: number;
  @IsNumber() storageMinTemp!: number;
  @IsNumber() storageMaxTemp!: number;
  @IsOptional() @IsNumber() minVolumeMl?: number;
  @IsOptional() @IsNumber() maxVolumeMl?: number;
  @IsOptional() @IsString() preparationMethod?: string;
}
