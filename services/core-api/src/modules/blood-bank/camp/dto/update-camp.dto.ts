import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateCampDto {
  @IsOptional() @IsString() campName?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsString() teamLead?: string;
  @IsOptional() @IsInt() @Min(0) estimatedDonors?: number;
  @IsOptional() @IsInt() @Min(0) actualDonors?: number;
  @IsOptional() @IsInt() @Min(0) unitsCollected?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() summary?: string;
}