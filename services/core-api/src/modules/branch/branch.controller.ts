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
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { Permissions } from "../auth/permissions.decorator";
import { PERM } from "../iam/iam.constants";
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

  @IsString()
  @Matches(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/, {
    message: "gstNumber must be a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)",
  })
  gstNumber!: string;

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
  @Matches(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/, {
    message: "gstNumber must be a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)",
  })
  gstNumber?: string;

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

function isGlobalAdmin(principal: any): boolean {
  if (!principal) return false;
  return (
    principal.roleScope === "GLOBAL" ||
    principal.roleCode === "SUPER_ADMIN" ||
    principal.role === "SUPER_ADMIN"
  );
}

@ApiTags("branches")
@Controller("branches")
export class BranchController {
  constructor(private readonly branches: BranchService) {}

  @Permissions(PERM.BRANCH_READ)
  @Get()
  async list(@Query() q: ListBranchesQuery, @Req() req: any) {
    const principal = req.principal;

    if (isGlobalAdmin(principal)) {
      return this.branches.list({ q: q.q ?? null }); // ALL branches
    }

    if (!principal?.branchId) return [];
    const row = await this.branches.get(principal.branchId);

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

  @Permissions(PERM.BRANCH_READ)
  @Get(":id")
  async get(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;

    if (!isGlobalAdmin(principal) && principal?.branchId !== id) {
      throw new ForbiddenException("You can only view your own branch");
    }

    return this.branches.get(id);
  }

  @Permissions(PERM.BRANCH_CREATE)
  @Post()
  async create(@Body() dto: CreateBranchDto, @Req() req: any) {
    const principal = req.principal;
    return this.branches.create(dto, principal?.userId ?? null);
  }

  @Permissions(PERM.BRANCH_UPDATE)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateBranchDto, @Req() req: any) {
    const principal = req.principal;
    return this.branches.update(id, dto, principal?.userId ?? null);
  }

  @Permissions(PERM.BRANCH_DELETE)
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;
    return this.branches.remove(id, principal?.userId ?? null);
  }
}
