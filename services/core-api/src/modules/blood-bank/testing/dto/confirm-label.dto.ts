import { IsString } from "class-validator";

export class ConfirmLabelDto {
  @IsString() unitId!: string;
}
