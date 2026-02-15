import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateSchedulingRuleDto {
  @IsOptional() @IsString() theatreSpaceId?: string;
  @IsInt() @Min(0) @Max(6) dayOfWeek!: number;
  @IsString() @IsNotEmpty() startTime!: string;
  @IsString() @IsNotEmpty() endTime!: string;
  @IsString() @IsNotEmpty() sessionType!: string; // ELECTIVE, EMERGENCY, BOTH
  @IsOptional() @IsString() lunchStart?: string;
  @IsOptional() @IsString() lunchEnd?: string;
  @IsOptional() @IsString() specialtyCode?: string;
  @IsOptional() @IsBoolean() isEffectiveDated?: boolean;
  @IsOptional() @IsString() effectiveFrom?: string;
  @IsOptional() @IsString() effectiveTo?: string;
}

export class UpdateSchedulingRuleDto {
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() sessionType?: string;
  @IsOptional() @IsString() lunchStart?: string;
  @IsOptional() @IsString() lunchEnd?: string;
  @IsOptional() @IsString() specialtyCode?: string;
  @IsOptional() @IsBoolean() isEffectiveDated?: boolean;
  @IsOptional() @IsString() effectiveFrom?: string;
  @IsOptional() @IsString() effectiveTo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateEmergencyPolicyDto {
  @IsOptional() @IsBoolean() hasDedicatedEmergencyOt?: boolean;
  @IsOptional() @IsString() dedicatedTheatreSpaceId?: string;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsString() escalationRule?: string;
}

export class CreateSurgeryTypeDefaultDto {
  @IsString() @IsNotEmpty() category!: string; // MINOR, MAJOR, COMPLEX, DAYCARE
  @IsInt() @Min(1) minDurationMin!: number;
  @IsInt() @Min(1) defaultDurationMin!: number;
  @IsInt() @Min(1) maxDurationMin!: number;
  @IsOptional() @IsBoolean() requiresIcuBooking?: boolean;
  @IsOptional() @IsBoolean() requiresBloodReservation?: boolean;
}

export class CreateCancellationPolicyDto {
  @IsOptional() @IsInt() @Min(0) minNoticeHours?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) cancellationAuthority?: string[];
  @IsOptional() @IsBoolean() mandatoryReasonRequired?: boolean;
  @IsOptional() @IsObject() reasons?: any;
  @IsOptional() @IsInt() @Min(0) maxReschedulesPerCase?: number;
  @IsOptional() @IsBoolean() priorityBoostOnReschedule?: boolean;
  @IsOptional() @IsBoolean() autoNotifyPatient?: boolean;
}

export class CreateBookingApprovalConfigDto {
  @IsOptional() @IsString() defaultMode?: string;
  @IsOptional() @IsString() minorMode?: string;
  @IsOptional() @IsString() majorMode?: string;
  @IsOptional() @IsString() complexMode?: string;
  @IsOptional() @IsString() emergencyMode?: string;
  @IsOptional() @IsInt() @Min(1) approvalTimeoutHours?: number;
}

export class CreateUtilizationTargetDto {
  @IsString() @IsNotEmpty() metricCode!: string;
  @IsInt() @Min(0) targetValue!: number;
  @IsOptional() @IsInt() alertThresholdLow?: number;
  @IsOptional() @IsInt() alertThresholdHigh?: number;
}

export class CreateRecoveryProtocolDto {
  @IsString() @IsNotEmpty() surgeryCategory!: string;
  @IsOptional() @IsInt() @Min(1) monitoringFrequencyMin?: number;
  @IsOptional() @IsObject() mandatoryVitals?: any;
  @IsOptional() @IsInt() @Min(1) minRecoveryDurationMin?: number;
  @IsOptional() @IsInt() @Min(0) dischargeScoreThreshold?: number;
  @IsOptional() @IsObject() escalationRules?: any;
  @IsOptional() @IsString() dischargeSignOffRole?: string;
}

export class CreateNotificationRuleDto {
  @IsString() @IsNotEmpty() eventType!: string;
  @IsArray() @IsString({ each: true }) recipientRoles!: string[];
  @IsArray() @IsString({ each: true }) channels!: string[];
  @IsString() @IsNotEmpty() timing!: string;
}
