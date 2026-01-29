import { IsBoolean, IsOptional, IsString, MaxLength, IsInt, Min } from "class-validator";

export class UpsertServiceCatalogueItemDto {
  @IsString()
  serviceItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  overrides?: any;
}
