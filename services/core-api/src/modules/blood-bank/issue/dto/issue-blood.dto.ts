import { IsNumber, IsOptional, IsString } from "class-validator";

export class IssueBloodDto {
  @IsString() crossMatchId!: string;
  @IsString() issuedTo!: string;
  @IsOptional() @IsString() issuedToWard?: string;
  @IsOptional() @IsNumber() transportTemp?: number;
}
