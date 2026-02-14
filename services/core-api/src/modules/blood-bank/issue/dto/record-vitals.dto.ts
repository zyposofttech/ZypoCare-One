import { IsNumber, IsOptional } from "class-validator";

export class RecordVitalsDto {
  @IsOptional() interval?: string;
  @IsOptional() vitals?: any;
  @IsOptional() @IsNumber() volumeTransfused?: number;
}
