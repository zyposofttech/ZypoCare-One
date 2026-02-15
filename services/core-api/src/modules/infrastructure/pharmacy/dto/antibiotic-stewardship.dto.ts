import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsString, ArrayMinSize } from "class-validator";

export class BulkSetHighAlertDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  drugIds!: string[];

  @IsBoolean()
  @Type(() => Boolean)
  isHighAlert!: boolean;
}

export class BulkSetAntibioticStewardshipDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  drugIds!: string[];

  @IsIn(["UNRESTRICTED", "RESTRICTED", "RESERVE"])
  level!: string;
}
