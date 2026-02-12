import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { CreateSupplierDto } from "./create-supplier.dto";

export class BulkImportSuppliersDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierDto)
  suppliers!: CreateSupplierDto[];
}
