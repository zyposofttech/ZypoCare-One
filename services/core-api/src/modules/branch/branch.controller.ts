import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { PrincipalGuard } from "../auth/principal.guard";
import { Roles } from "../auth/roles.decorator";
import { BranchService } from "./branch.service";

class ListBranchesQuery {
  @IsOptional()
  @IsString()
  q?: string;
}

class CreateBranchDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/, {
    message: "code must be 2–32 chars, letters/numbers/hyphen (e.g. BLR-EC)",
  })
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone2?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  contactEmail?: string;
}

class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone2?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  contactEmail?: string;
}

function hasRole(principal: any, role: string) {
  if (!principal) return false;
  if (principal.role === role) return true;
  const roles = principal.roles;
  if (Array.isArray(roles)) return roles.includes(role);
  if (typeof roles === "string") return roles.split(",").map((s) => s.trim()).includes(role);
  return false;
}
function hasSuperAdminRole(principal: any): boolean {
  if (!principal) return false;
  if (principal.role === "SUPER_ADMIN") return true;
  if (principal.roleCode === "SUPER_ADMIN") return true;
  if (Array.isArray(principal.roles)) return principal.roles.includes("SUPER_ADMIN");
  if (typeof principal.roles === "string")
    return principal.roles.split(",").map((r: string) => r.trim()).includes("SUPER_ADMIN");
  return false;
}
function isSuperAdmin(req: any): boolean {
  const principal = req?.principal;

  // 1) principal fields
  if (principal?.role === "SUPER_ADMIN") return true;
  if (principal?.roleCode === "SUPER_ADMIN") return true;

  // 2) principal.roles (array or string)
  if (Array.isArray(principal?.roles) && principal.roles.includes("SUPER_ADMIN")) return true;
  if (typeof principal?.roles === "string") {
    const roles = principal.roles.split(",").map((r: string) => r.trim());
    if (roles.includes("SUPER_ADMIN")) return true;
  }

  // 3) Keycloak token roles (common)
  const tokenRoles: string[] = req?.user?.realm_access?.roles || [];
  if (tokenRoles.includes("SUPER_ADMIN")) return true;

  // 4) resource_access (optional / client roles)
  // Example: req.user.resource_access?.["excelcare"]?.roles
  const ra = req?.user?.resource_access;
  if (ra && typeof ra === "object") {
    for (const k of Object.keys(ra)) {
      const r = ra[k]?.roles;
      if (Array.isArray(r) && r.includes("SUPER_ADMIN")) return true;
    }
  }

  return false;
}

@ApiTags("branches")
@Controller("branches")
@UseGuards(PrincipalGuard)
export class BranchController {
  constructor(private readonly branches: BranchService) { }

  @Get()
  async list(@Query() q: ListBranchesQuery, @Req() req: any) {
    const principal = req.principal;

    if (isSuperAdmin(req)) {
      return this.branches.list({ q: q.q ?? null }); // returns ALL branches
    }

    // Everyone else: only their branch
    if (!principal?.branchId) return [];
    const row = await this.branches.get(principal.branchId);

    // optional search filter for non-super
    if (q.q) {
      const term = q.q.toLowerCase();
      const match =
        row.name.toLowerCase().includes(term) ||
        row.city.toLowerCase().includes(term) ||
        String(row.code).toLowerCase() === term;

      return match ? [row] : [];
    }

    return [row];
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;

    if (!isSuperAdmin(req) && principal?.branchId !== id) {
      throw new ForbiddenException("You can only view your own branch");
    }

    return this.branches.get(id);
  }



  @Roles("SUPER_ADMIN")
  @Post()
  async create(@Body() dto: CreateBranchDto, @Req() req: any) {
    const principal = req.principal;
    return this.branches.create(dto, principal?.id ?? null);
  }

  @Roles("SUPER_ADMIN")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateBranchDto, @Req() req: any) {
    const principal = req.principal;
    return this.branches.update(id, dto, principal?.id ?? null);
  }

  @Roles("SUPER_ADMIN")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;
    return this.branches.remove(id, principal?.id ?? null);
  }
}
