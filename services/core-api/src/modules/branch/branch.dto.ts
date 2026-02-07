import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const RE_BRANCH_CODE = /^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/;
const RE_GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const RE_PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const RE_PIN = /^\d{6}$/;
const RE_PHONE = /^[0-9+][0-9()\-\s]{6,19}$/;
const RE_CURRENCY = /^[A-Z]{3,8}$/;
// IANA TZ examples: Asia/Kolkata, America/Argentina/Buenos_Aires
const RE_TZ = /^[A-Za-z_]+(?:\/[A-Za-z_]+)+$/;

function trim(v: any) {
  return typeof v === "string" ? v.trim() : v;
}
function upper(v: any) {
  return typeof v === "string" ? v.trim().toUpperCase() : v;
}
function lower(v: any) {
  return typeof v === "string" ? v.trim().toLowerCase() : v;
}
function toBool(v: any): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return undefined;
}
function toStringArray(v: any): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return undefined;
}

export type BranchListMode = "full" | "selector";
export const BRANCH_ACCREDITATIONS = ["NABH", "JCI"] as const;
export type BranchAccreditation = (typeof BRANCH_ACCREDITATIONS)[number];

export class ListBranchesQueryDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  q?: string;

  // supports query: onlyActive=true/1/yes
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  onlyActive?: boolean;

  // mode=selector for lite payload; default full
  @IsOptional()
  @Transform(({ value }) => {
    const s = String(value ?? "").trim().toLowerCase();
    if (!s) return undefined;
    return s === "selector" ? "selector" : s === "full" ? "full" : value;
  })
  @IsIn(["full", "selector"])
  mode?: BranchListMode;
}

export class CreateBranchDto {
  // Required fields
  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_BRANCH_CODE, {
    message: "code must be 2–32 chars, letters/numbers/hyphen (e.g. BLR-EC)",
  })
  code!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  legalEntityName!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(5)
  @MaxLength(240)
  address!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_PIN, { message: "pinCode must be a 6-digit PIN (e.g. 560100)" })
  pinCode!: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(80)
  country?: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_PHONE, { message: "contactPhone1 must be a valid phone number" })
  @MaxLength(20)
  contactPhone1!: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_PHONE, { message: "contactPhone2 must be a valid phone number" })
  @MaxLength(20)
  contactPhone2?: string;

  @Transform(({ value }) => lower(value))
  @IsEmail()
  @MaxLength(120)
  contactEmail!: string;

  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_GSTIN, {
    message: "gstNumber must be a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)",
  })
  gstNumber!: string;

  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_PAN, {
    message: "panNumber must be a valid 10-character PAN (e.g. ABCDE1234F)",
  })
  panNumber!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  clinicalEstRegNumber!: string;

  // Optional fields
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(64)
  rohiniId?: string;

  // ABDM HFR ID (auto-populated later; allow optional input)
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(64)
  hfrId?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(200)
  website?: string;

  // Social links (stored as JSON in service)
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) facebook?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) instagram?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) linkedin?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) x?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) youtube?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const arr = toStringArray(value);
    return arr?.map((x) => x.toUpperCase());
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(BRANCH_ACCREDITATIONS, { each: true })
  accreditations?: BranchAccreditation[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200000)
  bedCount?: number;

  @IsOptional()
  @IsDateString()
  establishedDate?: string;

  // Settings
  @IsOptional()
  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_CURRENCY, { message: "defaultCurrency must be like INR, USD, AED" })
  @MaxLength(8)
  defaultCurrency?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_TZ, { message: "timezone must be an IANA timezone (e.g. Asia/Kolkata)" })
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(400)
  workingHoursText?: string;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  emergency24x7?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  multiLanguageSupport?: boolean;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  supportedLanguages?: string[];
}

export class UpdateBranchDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(80) city?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(160) legalEntityName?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(5) @MaxLength(240) address?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_PIN, { message: "pinCode must be a 6-digit PIN (e.g. 560100)" })
  pinCode?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80) state?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80) country?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_PHONE, { message: "contactPhone1 must be a valid phone number" })
  @MaxLength(20)
  contactPhone1?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_PHONE, { message: "contactPhone2 must be a valid phone number" })
  @MaxLength(20)
  contactPhone2?: string;

  @IsOptional() @Transform(({ value }) => lower(value)) @IsEmail() @MaxLength(120) contactEmail?: string;

  @IsOptional()
  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_GSTIN, { message: "gstNumber must be a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)" })
  gstNumber?: string;

  @IsOptional()
  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_PAN, { message: "panNumber must be a valid 10-character PAN (e.g. ABCDE1234F)" })
  panNumber?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(64) clinicalEstRegNumber?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(64) rohiniId?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(64) hfrId?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) website?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) facebook?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) instagram?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) linkedin?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) x?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) youtube?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const arr = toStringArray(value);
    return arr?.map((x) => x.toUpperCase());
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(BRANCH_ACCREDITATIONS, { each: true })
  accreditations?: BranchAccreditation[];

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(200000) bedCount?: number;
  @IsOptional() @IsDateString() establishedDate?: string;

  @IsOptional()
  @Transform(({ value }) => upper(value))
  @IsString()
  @Matches(RE_CURRENCY, { message: "defaultCurrency must be like INR, USD, AED" })
  @MaxLength(8)
  defaultCurrency?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(RE_TZ, { message: "timezone must be an IANA timezone (e.g. Asia/Kolkata)" })
  @MaxLength(64)
  timezone?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) fiscalYearStartMonth?: number;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(400) workingHoursText?: string;

  @IsOptional() @Transform(({ value }) => toBool(value)) @IsBoolean() emergency24x7?: boolean;
  @IsOptional() @Transform(({ value }) => toBool(value)) @IsBoolean() multiLanguageSupport?: boolean;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  supportedLanguages?: string[];
}
