import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateLookbackDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  /**
   * NOTE: DB enum is LookbackTriggerType = REACTIVE_TTI | POST_ISSUE_REVIEW | MANUAL
   * We also accept a few legacy UI values and map them inside the service.
   */
  @IsIn([
    "REACTIVE_TTI",
    "POST_ISSUE_REVIEW",
    "MANUAL",
    // legacy
    "TTI_REACTIVE",
    "DONOR_SELF_REPORT",
    "RECIPIENT_REACTION",
    "OTHER",
  ])
  triggerType!:
    | "REACTIVE_TTI"
    | "POST_ISSUE_REVIEW"
    | "MANUAL"
    | "TTI_REACTIVE"
    | "DONOR_SELF_REPORT"
    | "RECIPIENT_REACTION"
    | "OTHER";

  @IsString()
  @IsNotEmpty()
  donorId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
