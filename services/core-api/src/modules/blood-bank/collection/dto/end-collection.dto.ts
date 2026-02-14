import { IsNumber, IsOptional, IsString } from "class-validator";

export class EndCollectionDto {
  @IsOptional() @IsNumber() volumeMl?: number;
  @IsOptional() @IsString() notes?: string;
}
