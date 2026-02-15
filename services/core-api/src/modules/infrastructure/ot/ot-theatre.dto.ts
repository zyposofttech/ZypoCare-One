import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateTheatreEngineeringDto {
  @IsOptional() @IsNumber() area?: number;
  @IsOptional() @IsNumber() ceilingHeight?: number;

  @IsOptional() @IsBoolean() gasO2?: boolean;
  @IsOptional() @IsInt() @Min(0) gasO2Outlets?: number;
  @IsOptional() @IsBoolean() gasN2O?: boolean;
  @IsOptional() @IsInt() @Min(0) gasN2OOutlets?: number;
  @IsOptional() @IsBoolean() gasAir?: boolean;
  @IsOptional() @IsInt() @Min(0) gasAirOutlets?: number;
  @IsOptional() @IsBoolean() gasVacuum?: boolean;
  @IsOptional() @IsInt() @Min(0) gasVacuumOutlets?: number;

  @IsOptional() @IsInt() @Min(0) upsOutlets?: number;
  @IsOptional() @IsBoolean() isolatedPowerSupply?: boolean;

  @IsOptional() @IsNumber() tempMin?: number;
  @IsOptional() @IsNumber() tempMax?: number;
  @IsOptional() @IsNumber() humidityMin?: number;
  @IsOptional() @IsNumber() humidityMax?: number;
  @IsOptional() @IsInt() @Min(0) luxLevel?: number;
  @IsOptional() @IsBoolean() emergencyLighting?: boolean;

  @IsOptional() @IsString() isoClass?: string;
  @IsOptional() @IsString() airflow?: string;
  @IsOptional() @IsString() pressure?: string;
  @IsOptional() @IsString() theatreType?: string;
}

export class UpdateTheatreSpecialtiesDto {
  @IsArray()
  @IsString({ each: true })
  specialtyCodes!: string[];
}

export class UpdateTheatreSchedulingParamsDto {
  @IsOptional() @IsInt() @Min(1) turnaroundTimeMin?: number;
  @IsOptional() @IsInt() @Min(1) cleaningTimeMin?: number;
  @IsOptional() @IsInt() @Min(1) maxCasesPerDay?: number;
  @IsOptional() @IsInt() @Min(10) defaultSlotMinor?: number;
  @IsOptional() @IsInt() @Min(10) defaultSlotMajor?: number;
  @IsOptional() @IsInt() @Min(10) defaultSlotComplex?: number;
  @IsOptional() @IsInt() @Min(0) bufferEmergencyMin?: number;
  @IsOptional() @IsBoolean() isEmergencyEligible?: boolean;
  @IsOptional() @IsBoolean() is24x7Emergency?: boolean;
}
