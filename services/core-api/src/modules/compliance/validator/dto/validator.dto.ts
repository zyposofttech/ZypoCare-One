import { IsEnum, IsOptional, IsString } from "class-validator";

export class RunValidatorDto {
  @IsString()
  workspaceId!: string;
}

export class ExportPackDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(["json", "csv"])
  @IsOptional()
  format?: "json" | "csv" = "json";
}
