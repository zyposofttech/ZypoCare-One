import { IsIn, IsOptional, IsString } from "class-validator";

const REACTION_TYPES = [
  "FEBRILE", "ALLERGIC", "HEMOLYTIC_ACUTE", "HEMOLYTIC_DELAYED",
  "TRALI", "TACO", "ANAPHYLAXIS", "BACTERIAL", "OTHER",
] as const;

export class ReportReactionDto {
  @IsIn(REACTION_TYPES as any) reactionType!: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() onsetTime?: string;
  @IsOptional() @IsString() managementNotes?: string;
  @IsOptional() investigationResults?: any;
}
