import { IsArray, IsString, ValidateNested } from "class-validator";

export class RecordSeparationDto {
  @IsString() parentUnitId!: string;
  @IsArray() components!: Array<{
    componentType: string;
    volumeMl?: number;
    expiryDate?: string;
    storageEquipmentId?: string;
  }>;
}
