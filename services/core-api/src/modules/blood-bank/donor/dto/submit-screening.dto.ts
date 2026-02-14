import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class SubmitScreeningDto {
  @IsOptional() dhqResponses?: any;
  @IsOptional() @IsNumber() hemoglobinGdl?: number;
  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsNumber() bpSystolic?: number;
  @IsOptional() @IsNumber() bpDiastolic?: number;
  @IsOptional() @IsNumber() temperatureC?: number;
  @IsOptional() @IsNumber() pulseRate?: number;
  @IsOptional() @IsString() eligibilityDecision?: string;
  @IsOptional() @IsString() decisionNotes?: string;
  @IsOptional() @IsBoolean() consentGiven?: boolean;
}
