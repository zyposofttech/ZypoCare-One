import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class AssignInventorySlotDto {
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @IsString()
  @IsNotEmpty()
  equipmentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  shelf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  slot?: string;
}
