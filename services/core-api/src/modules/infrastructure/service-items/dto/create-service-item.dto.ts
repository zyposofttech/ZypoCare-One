import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateServiceItemDto {
  @IsString()
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(120)
  category!: string;

  @IsOptional()
  @IsString()
  unit?: string | null;

  @IsOptional()
  @IsBoolean()
  isOrderable?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Optional mapping at create-time
  @IsOptional()
  @IsString()
  chargeMasterCode?: string | null;
}