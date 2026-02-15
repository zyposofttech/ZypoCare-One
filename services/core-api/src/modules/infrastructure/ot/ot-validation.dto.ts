import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SubmitReviewDto {
  @IsOptional() @IsString() comments?: string;
}

export class ReviewSuiteDto {
  @IsString() @IsNotEmpty() action!: string; // APPROVED, REJECTED, CONDITIONAL
  @IsOptional() @IsString() comments?: string;
}

export class DecommissionSuiteDto {
  @IsString() @IsNotEmpty() type!: string; // TEMPORARY, PERMANENT
  @IsOptional() @IsString() reason?: string;
}
