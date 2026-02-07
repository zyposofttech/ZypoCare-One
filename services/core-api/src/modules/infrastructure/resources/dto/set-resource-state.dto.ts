import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const RESOURCE_STATES = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
  "MAINTENANCE",
  "BLOCKED",
  "INACTIVE",
  "SANITIZATION",
] as const;

export class SetResourceStateDto {
  @IsIn(RESOURCE_STATES as unknown as string[])
  state!: (typeof RESOURCE_STATES)[number];

  // Optional reason (required by service when moving to RESERVED/BLOCKED)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
