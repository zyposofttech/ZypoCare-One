import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateStoreLinkDto {
  @IsString() @IsNotEmpty() pharmacyStoreId!: string;
  @IsString() @IsNotEmpty() linkType!: string; // OT_STORE, ANESTHESIA_STORE, NARCOTICS_VAULT
}

export class CreateConsumableTemplateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() surgeryCategory!: string; // OtSurgeryCategory enum
  @IsOptional() @IsString() specialtyCode?: string;
  @IsObject() items!: any; // JSON array of {name, qty, drugMasterId?}
}

export class UpdateConsumableTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() surgeryCategory?: string;
  @IsOptional() @IsString() specialtyCode?: string;
  @IsOptional() @IsObject() items?: any;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateImplantTrackingRuleDto {
  @IsString() @IsNotEmpty() category!: string; // OtImplantCategory enum
  @IsOptional() @IsBoolean() mandatoryBarcodeScan?: boolean;
  @IsOptional() @IsBoolean() mandatoryBatchSerial?: boolean;
  @IsOptional() @IsBoolean() mandatoryManufacturer?: boolean;
  @IsOptional() @IsBoolean() mandatoryPatientConsent?: boolean;
}

export class CreateParLevelDto {
  @IsString() @IsNotEmpty() itemName!: string;
  @IsOptional() @IsString() drugMasterId?: string;
  @IsInt() @Min(0) minStock!: number;
  @IsInt() @Min(0) reorderLevel!: number;
  @IsInt() @Min(1) reorderQty!: number;
  @IsInt() @Min(0) maxStock!: number;
  @IsOptional() @IsBoolean() isNeverOutOfStock?: boolean;
}

export class UpdateParLevelDto {
  @IsOptional() @IsString() itemName?: string;
  @IsOptional() @IsString() drugMasterId?: string;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
  @IsOptional() @IsInt() @Min(0) reorderLevel?: number;
  @IsOptional() @IsInt() @Min(1) reorderQty?: number;
  @IsOptional() @IsInt() @Min(0) maxStock?: number;
  @IsOptional() @IsBoolean() isNeverOutOfStock?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
