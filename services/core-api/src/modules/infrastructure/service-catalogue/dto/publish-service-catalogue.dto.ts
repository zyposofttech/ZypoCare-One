import { IsDateString, IsOptional } from "class-validator";

export class PublishServiceCatalogueDto {
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
