import { IsDateString, IsString } from "class-validator";

export class CloseServiceChargeMappingDto {
  @IsString()
  serviceItemId!: string;

  @IsDateString()
  effectiveTo!: string;
}
