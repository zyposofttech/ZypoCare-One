import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UploadEvidenceDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateEvidenceDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  expiresAt?: string;

  @IsEnum(["ACTIVE", "ARCHIVED"])
  @IsOptional()
  status?: "ACTIVE" | "ARCHIVED";
}

export class LinkEvidenceDto {
  @IsString()
  targetType!: string;

  @IsString()
  targetId!: string;
}
