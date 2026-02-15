import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RejectReportRunDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
