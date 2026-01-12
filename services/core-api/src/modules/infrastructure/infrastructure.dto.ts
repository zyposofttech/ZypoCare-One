import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/swagger";
import {
  LocationKind,
  ResourceType,
  RX_LOCATION_CODE_ANY,
  RX_ROOM_CODE,
  RX_RESOURCE_CODE_ANY,
  RX_UNIT_CODE,
} from "../../common/naming.util";
import { Matches } from "class-validator";

export class CreateLocationNodeDto {
  @IsIn(["CAMPUS", "BUILDING", "FLOOR", "ZONE"])
  kind!: LocationKind;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @Matches(RX_LOCATION_CODE_ANY)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string; // ISO

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null; // ISO or null
}

export class UpdateLocationNodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  // If you want to effective-date code changes too
  @IsOptional()
  @Matches(RX_LOCATION_CODE_ANY)
  code?: string;
}

export class SetBranchUnitTypesDto {
  @IsString({ each: true })
  unitTypeIds!: string[];
}

export class CreateUnitDto {
  @IsString()
  departmentId!: string;

  @IsString()
  unitTypeId!: string;

  @Matches(RX_UNIT_CODE)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsBoolean()
  usesRooms?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  usesRooms?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateUnitRoomDto {
  @IsString()
  unitId!: string;

  @Matches(RX_ROOM_CODE)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateUnitResourceDto {
  @IsString()
  unitId!: string;

  @IsOptional()
  @IsString()
  roomId?: string | null;

  @IsIn([
    "BED",
    "BAY",
    "CHAIR",
    "OT_TABLE",
    "PROCEDURE_TABLE",
    "DIALYSIS_STATION",
    "RECOVERY_BAY",
    "EXAM_SLOT",
    "INCUBATOR",
  ])
  resourceType!: ResourceType;

  @Matches(RX_RESOURCE_CODE_ANY)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSchedulable?: boolean;
}

export class UpdateUnitResourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSchedulable?: boolean;
}

export class SetResourceStateDto {
  @IsIn(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "INACTIVE"])
  state!: "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "INACTIVE";
}

// ---------------- Equipment ----------------

export class CreateEquipmentAssetDto {
  @IsString()
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsIn(["GENERAL", "RADIOLOGY", "ULTRASOUND"])
  category!: "GENERAL" | "RADIOLOGY" | "ULTRASOUND";

  @IsString() make!: string;
  @IsString() model!: string;
  @IsString() serial!: string;

  @IsString() ownerDepartmentId!: string;
  @IsOptional() @IsString() unitId?: string | null;
  @IsOptional() @IsString() roomId?: string | null;
  @IsOptional() @IsString() locationNodeId?: string | null;

  @IsOptional() @IsIn(["OPERATIONAL", "DOWN", "MAINTENANCE", "RETIRED"])
  operationalStatus?: "OPERATIONAL" | "DOWN" | "MAINTENANCE" | "RETIRED";

  @IsOptional() @IsString() amcVendor?: string | null;
  @IsOptional() @IsDateString() amcValidFrom?: string | null;
  @IsOptional() @IsDateString() amcValidTo?: string | null;
  @IsOptional() @IsDateString() warrantyValidTo?: string | null;

  @IsOptional() @IsInt() @Min(1) pmFrequencyDays?: number | null;
  @IsOptional() @IsDateString() nextPmDueAt?: string | null;

  // Compliance
  @IsOptional() @IsString() aerbLicenseNo?: string | null;
  @IsOptional() @IsDateString() aerbValidTo?: string | null;
  @IsOptional() @IsString() pcpndtRegNo?: string | null;
  @IsOptional() @IsDateString() pcpndtValidTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isSchedulable?: boolean;
}

export class UpdateEquipmentAssetDto extends PartialType(CreateEquipmentAssetDto) { }



export class CreateDowntimeDto {
  @IsString()
  assetId!: string;

  @IsString()
  @MaxLength(240)
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseDowntimeDto {
  @IsString()
  ticketId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------------- Services ----------------

export class CreateChargeMasterItemDto {
  @IsString()
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsString() unit?: string | null;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateServiceItemDto {
  @IsString()
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(120)
  category!: string;

  @IsOptional() @IsString() unit?: string | null;

  @IsOptional() @IsBoolean() isOrderable?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // Optional mapping at create-time
  @IsOptional() @IsString() chargeMasterCode?: string | null;
}

export class UpsertServiceChargeMappingDto {
  @IsString()
  serviceItemId!: string;

  @IsString()
  chargeMasterItemId!: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateFixItDto {
  @IsIn(["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"])
  status!: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

  @IsOptional()
  @IsString()
  assignedToUserId?: string | null;
}

// ---------------- Scheduling ----------------

export class CreateProcedureBookingDto {
  @IsString()
  unitId!: string;

  @IsString()
  resourceId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  // Strict at scheduling time (your requirement)
  @IsBoolean()
  consentOk!: boolean;

  @IsBoolean()
  anesthesiaOk!: boolean;

  @IsBoolean()
  checklistOk!: boolean;

  @IsOptional()
  @IsString()
  patientId?: string | null;

  @IsOptional()
  @IsString()
  departmentId?: string | null;
}

export class CancelProcedureBookingDto {
  @IsString()
  reason!: string;
}

// ---------------- Imports ----------------

export class ValidateImportDto {
  @IsIn(["LOCATIONS", "UNITS", "ROOMS", "RESOURCES", "EQUIPMENT", "SERVICE_ITEMS", "CHARGE_MASTER"])
  entityType!: any;

  @IsOptional()
  @IsString()
  fileName?: string;

  // Raw rows from UI parser (CSV/XLS)
  rows!: any[];
}

export class CommitImportDto {
  @IsString()
  jobId!: string;
}

// ---------------- Go-Live ----------------

export class RunGoLiveDto {
  @IsOptional()
  @IsBoolean()
  persist?: boolean; // default true
}
