import { IsOptional, IsString } from "class-validator";

export class BedsideVerifyDto {
  @IsOptional() @IsString() scannedPatientId?: string;
  @IsOptional() @IsString() scannedUnitBarcode?: string;
}
