import { IsOptional, IsString } from "class-validator";

export class RecordAdverseEventDto {
  @IsString() eventDescription!: string;
  @IsOptional() @IsString() notes?: string;
}
