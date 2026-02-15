import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from "class-validator";

const REACTION_TYPES = [
  "FEBRILE",
  "ALLERGIC",
  "ANAPHYLAXIS",
  "HEMOLYTIC_ACUTE",
  "TRALI",
  "TACO",
  "BACTERIAL",
  "OTHER",
] as const;

export class ReportReactionDto {
  @IsIn(REACTION_TYPES as any) reactionType!: string;

  /**
   * Free-text severity comes from clinical practice; we still normalize in service.
   * Recommended: MILD | MODERATE | SEVERE | LIFE_THREATENING | FATAL
   */
  @IsOptional() @IsString() severity?: string;

  @IsOptional() @IsString() description?: string;

  /** ISO timestamp; defaults to now when omitted */
  @IsOptional() @IsString() onsetTime?: string;

  @IsOptional() @IsString() managementNotes?: string;

  /** JSON object stored in DB; allow structured investigation fields */
  @IsOptional() @IsObject() investigationResults?: Record<string, any>;

  /** PRD S9 hard-stop: default true (handled in service) */
  @IsOptional() @IsBoolean() transfusionStopped?: boolean;

  /** optional physician notification flags (stored on TransfusionRecord.doctorNotifiedAt) */
  @IsOptional() @IsBoolean() doctorNotified?: boolean;
  @IsOptional() @IsString() doctorNotifiedAt?: string;

  /** optional vitals snapshot captured at time of reaction/stop */
  @IsOptional() @IsObject() stopVitals?: Record<string, any>;
}
