import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

const BAG_TYPES = ["SINGLE", "DOUBLE", "TRIPLE", "QUADRUPLE"] as const;
const COLLECTION_TYPES = ["WHOLE_BLOOD_350", "WHOLE_BLOOD_450", "APHERESIS_SDP", "APHERESIS_PLASMA"] as const;

export class StartCollectionDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() donorId!: string;
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsIn(BAG_TYPES as any) bagType?: string;
  @IsOptional() @IsIn(COLLECTION_TYPES as any) collectionType?: string;
  @IsOptional() @IsNumber() volumeMl?: number;
}
