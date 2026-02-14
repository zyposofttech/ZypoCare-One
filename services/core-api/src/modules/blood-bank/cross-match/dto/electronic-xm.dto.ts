import { IsString } from "class-validator";

export class ElectronicXMDto {
  @IsString() unitId!: string;
}
