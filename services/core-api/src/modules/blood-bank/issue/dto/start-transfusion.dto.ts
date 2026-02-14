import { IsOptional } from "class-validator";

export class StartTransfusionDto {
  @IsOptional() vitals?: any;
}
