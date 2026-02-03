import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) name!: string;

  // Assign by template code (SUPER_ADMIN / BRANCH_ADMIN / IT_ADMIN)
  @IsString() roleCode!: string;

  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() staffId?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() roleCode?: string;
  @IsOptional() @IsString() branchId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() staffId?: string | null;
  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional() @IsString() reason?: string;
}
export class CreateRoleDto {
  @IsString() @MinLength(2) roleName!: string;
  
  // Must be uppercase, e.g., "SENIOR_NURSE"
  @IsString() @MinLength(2) roleCode!: string;

  @IsEnum(["GLOBAL", "BRANCH"]) scope!: "GLOBAL" | "BRANCH";

  // List of permission codes, e.g., ["PATIENT_READ", "VITALS_WRITE"]
  @IsArray() @IsString({ each: true }) permissions!: string[];

  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional() @IsString() reason?: string;
}

export class UpdateRoleDto {
  @IsOptional() @IsString() roleName?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];

  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional() @IsString() reason?: string;
}
export class CreatePermissionDto {
  @IsString() @MinLength(3) code!: string;       // e.g. "PATIENT_VIEW_SENSITIVE"
  @IsString() @MinLength(2) name!: string;       // e.g. "View Sensitive Patient Data"
  @IsString() @MinLength(2) category!: string;   // e.g. "Clinical"
  @IsOptional() @IsString() description?: string;

  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional() @IsString() reason?: string;
}

export class UpdatePermissionDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @MinLength(2) category?: string;
  @IsOptional() @IsString() description?: string;

  // Optional operator-provided reason; persisted in audit logs.
  @IsOptional() @IsString() reason?: string;
}
