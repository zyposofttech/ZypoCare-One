import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class EndTransfusionDto {
  @IsOptional() vitals?: any;
  @IsOptional() @IsNumber() volumeTransfused?: number;
  @IsOptional() @IsBoolean() hasReaction?: boolean;
  @IsOptional() @IsString() outcome?: string;
}
