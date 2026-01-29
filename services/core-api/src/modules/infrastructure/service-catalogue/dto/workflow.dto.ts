import { IsOptional, IsString } from "class-validator";

export class WorkflowNoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}
