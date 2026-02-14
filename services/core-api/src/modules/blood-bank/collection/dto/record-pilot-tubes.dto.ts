import { IsArray, IsString } from "class-validator";

export class RecordPilotTubesDto {
  @IsArray() @IsString({ each: true }) labels!: string[];
}
