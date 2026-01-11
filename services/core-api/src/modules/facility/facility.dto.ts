import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

// --- Facility registry (under a Branch) ---

export class CreateFacilityDto {
  @IsOptional() @IsString() branchId?: string;

  @IsString() @IsNotEmpty()
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  addressLine1?: string;

  @IsOptional() @IsString()
  addressLine2?: string;

  @IsString() @IsNotEmpty()
  city!: string;

  @IsOptional() @IsString()
  state?: string;

  @IsOptional() @IsString()
  postalCode?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  email?: string;
}

export class UpdateFacilityDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// --- Masters (department/specialty/ward/room/bed) ---

export class CreateDepartmentDto {
  @IsOptional() @IsString() branchId?: string;

  @IsString() @IsNotEmpty()
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateSpecialtyDto {
  @IsOptional() @IsString() branchId?: string;

  @IsString() @IsNotEmpty()
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString()
  departmentId?: string;
}

export class UpdateSpecialtyDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateWardDto {
  @IsOptional() @IsString() branchId?: string;

  @IsString() @IsNotEmpty()
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString()
  specialty?: string;
}

export class UpdateWardDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateRoomDto {
  @IsString() @IsNotEmpty()
  code!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString()
  floor?: string;

  @IsOptional() @IsString()
  type?: string;
}

export class UpdateRoomDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateBedDto {
  @IsString() @IsNotEmpty()
  code!: string;
}

export class UpdateBedDto {
  @IsOptional() @IsString() code?: string;

  // NOTE: state updates are validated in the service to enforce transitions.
  @IsOptional() @IsIn(["VACANT", "OCCUPIED", "CLEANING", "MAINTENANCE"] as const)
  state?: "VACANT" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsString()
  note?: string;
}
