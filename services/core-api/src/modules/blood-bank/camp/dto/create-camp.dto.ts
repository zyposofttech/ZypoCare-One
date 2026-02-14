import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateCampDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() campName!: string;
  @IsString() campDate!: string;
  @IsString() location!: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsString() teamLead?: string;
  @IsOptional() @IsInt() @Min(0) estimatedDonors?: number;
  @IsOptional() equipmentChecklist?: any;
}
