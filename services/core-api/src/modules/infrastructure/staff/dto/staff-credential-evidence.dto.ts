import { IsString } from "class-validator";

export class AddStaffCredentialEvidenceDto {
  @IsString()
  staffDocumentId!: string;
}
