import { IsString } from "class-validator";

export class ReturnUnitDto {
  @IsString() reason!: string;
}
