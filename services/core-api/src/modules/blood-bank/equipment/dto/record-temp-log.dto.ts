import { IsNumber, IsOptional, IsString } from "class-validator";

export class RecordTempLogDto {
  @IsNumber() temperature!: number;
  @IsOptional() @IsString() recordedAt?: string;
  @IsOptional() @IsString() recordedBy?: string;
}
