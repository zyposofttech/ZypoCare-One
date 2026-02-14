import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateApprovalDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  changeType!: string;

  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  payloadDraft!: any;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class DecideApprovalDto {
  @IsEnum(["APPROVED", "REJECTED"])
  decision!: "APPROVED" | "REJECTED";

  @IsString()
  @IsOptional()
  @MaxLength(500)
  decisionNotes?: string;
}
