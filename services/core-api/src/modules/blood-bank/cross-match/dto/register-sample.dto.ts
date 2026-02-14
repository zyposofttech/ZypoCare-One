import { IsOptional, IsString } from "class-validator";

export class RegisterSampleDto {
  @IsOptional() @IsString() sampleId?: string;
  @IsOptional() @IsString() collectedAt?: string;
  @IsOptional() @IsString() verifiedBy?: string;
}
