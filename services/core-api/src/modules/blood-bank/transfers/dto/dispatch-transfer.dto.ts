import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class DispatchTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  courierName?: string;

  @IsOptional()
  @IsNumber()
  transportBoxTempC?: number;
}
