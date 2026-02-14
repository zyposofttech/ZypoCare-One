import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

const URGENCIES = ["ROUTINE", "URGENT", "EMERGENCY", "MTP"] as const;
const COMPONENT_TYPES = ["WHOLE_BLOOD", "PRBC", "FFP", "PLATELET_RDP", "PLATELET_SDP", "CRYOPRECIPITATE", "CRYO_POOR_PLASMA"] as const;

export class CreateRequestDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() patientId!: string;
  @IsOptional() @IsString() encounterId?: string;
  @IsOptional() @IsIn(COMPONENT_TYPES as any) componentType?: string;
  @IsOptional() @IsInt() @Min(1) quantityRequested?: number;
  @IsOptional() @IsIn(URGENCIES as any) urgency?: string;
  @IsOptional() @IsString() indication?: string;
  @IsOptional() @IsString() requiredByDate?: string;
}
