import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateServiceCodeMappingDto {
  @IsString()
  serviceItemId!: string;

  @IsString()
  codeEntryId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  meta?: any;
}
