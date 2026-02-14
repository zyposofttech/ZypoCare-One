import { IsOptional, IsString } from "class-validator";

export class RecordConsentDto {
  @IsOptional() @IsString() signature?: string;
}
