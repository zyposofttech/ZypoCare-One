import { IsIn, IsOptional, IsString } from "class-validator";

const BB_TYPES = ["HOSPITAL_BASED", "STANDALONE", "STORAGE_CENTRE", "COMPONENT_SEPARATION_CENTRE"] as const;

export class UpsertFacilityDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() licenseExpiryDate?: string;
  @IsOptional() @IsString() sbtsRegistrationId?: string;
  @IsOptional() @IsString() nacoId?: string;
  @IsOptional() @IsIn(BB_TYPES as any) type?: string;
  @IsOptional() operatingHours?: any;
  @IsOptional() physicalLayout?: any;
}
