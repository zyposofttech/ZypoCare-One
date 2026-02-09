import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

// ABDM / HPR verification payload.
// We keep this flexible (no strict schema coupling) so we can store provider responses in JSON.
export class VerifyStaffHprDto {
  // HPR ID (if verified). Optional because some flows may only store verification response.
  @IsOptional()
  @IsString()
  @MaxLength(160)
  hprId?: string;

  @IsIn(["VERIFIED", "FAILED", "PENDING"] as unknown as string[])
  status!: "VERIFIED" | "FAILED" | "PENDING";

  @IsOptional()
  response?: any;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}
