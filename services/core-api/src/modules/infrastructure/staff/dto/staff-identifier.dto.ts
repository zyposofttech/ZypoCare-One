import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

// Keep aligned with schema.prisma enum StaffIdentifierType
const IDENT_TYPES = ["AADHAAR", "PAN", "PASSPORT", "HPR_ID", "OTHER"] as const;

export class StaffIdentifierInputDto {
  @IsIn(IDENT_TYPES as unknown as string[])
  type!: (typeof IDENT_TYPES)[number];

  /**
   * Raw identifier value (NEVER stored in DB). We store hash + last4 only.
   */
  @IsString()
  @MaxLength(64)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  issuedBy?: string | null;

  @IsOptional()
  @IsString()
  // ISO date string accepted; parsed server-side
  issuedAt?: string | null;
}
