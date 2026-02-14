import { IsOptional, IsString } from "class-validator";

export class VerifyResultsDto {
  @IsString() unitId!: string;
  @IsOptional() @IsString() notes?: string;
}
