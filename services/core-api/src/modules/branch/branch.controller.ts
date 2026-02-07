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
import { Permissions } from "../auth/permissions.decorator";
import { PERM } from "../iam/iam.constants";
import { BranchService } from "./branch.service";
import { CreateBranchDto, ListBranchesQueryDto, UpdateBranchDto } from "./branch.dto";

function isGlobalAdmin(principal: any): boolean {
  if (!principal) return false;
  return (
    principal.roleScope === "GLOBAL" ||
    principal.roleCode === "CORPORATE_ADMIN" ||
    principal.roleCode === "GLOBAL_ADMIN" ||
    principal.roleCode === "SUPER_ADMIN" ||
    principal.role === "CORPORATE_ADMIN" ||
    principal.role === "GLOBAL_ADMIN" ||
    principal.role === "SUPER_ADMIN"
  );
}

@ApiTags("branches")
@Controller("branches")
export class BranchController {
  constructor(private readonly branches: BranchService) {}

  @Permissions(PERM.BRANCH_READ)
  @Get()
  async list(@Query() q: ListBranchesQueryDto, @Req() req: any) {
    const principal = req.principal;

    // If ValidationPipe(transform:true) is enabled, these come already typed.
    // If not, this still works because DTO transforms handle it.
    const onlyActiveBool = q.onlyActive === true ? true : null;
    const modeNorm = (q.mode ?? "full") as any;

    if (isGlobalAdmin(principal)) {
      return this.branches.list({
        q: q.q ?? null,
        onlyActive: onlyActiveBool,
        mode: modeNorm,
      });
    }

    if (!principal?.branchId) return [];
    const row = await this.branches.get(principal.branchId);

    if (onlyActiveBool && !row.isActive) return [];

    const outRow: any =
      modeNorm === "selector"
        ? { id: row.id, code: row.code, name: row.name, city: row.city, isActive: row.isActive }
        : row;

    if (q.q) {
      const term = q.q.toLowerCase();
      const match =
        row.name.toLowerCase().includes(term) ||
        row.city.toLowerCase().includes(term) ||
        String(row.code).toLowerCase() === term;
      return match ? [outRow] : [];
    }
    return [outRow];
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
    if (!isGlobalAdmin(principal)) {
      throw new ForbiddenException("Only global admins can create branches");
    }
    const actorUserId = principal?.userId ?? req?.user?.sub ?? null;
    return this.branches.create(dto, actorUserId);
  }

  @Permissions(PERM.BRANCH_UPDATE)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateBranchDto, @Req() req: any) {
    const principal = req.principal;
    if (!isGlobalAdmin(principal)) {
      throw new ForbiddenException("Only global admins can update branches");
    }
    const actorUserId = principal?.userId ?? req?.user?.sub ?? null;
    return this.branches.update(id, dto, actorUserId);
  }

  // ---------------- Soft lifecycle toggle (preferred over delete) ----------------

  @Permissions(PERM.BRANCH_UPDATE)
  @Patch(":id/deactivate")
  async deactivate(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;
    if (!isGlobalAdmin(principal)) {
      throw new ForbiddenException("Only global admins can deactivate branches");
    }
    const actorUserId = principal?.userId ?? req?.user?.sub ?? null;
    return this.branches.setActive(id, false, actorUserId);
  }

  @Permissions(PERM.BRANCH_UPDATE)
  @Patch(":id/reactivate")
  async reactivate(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;
    if (!isGlobalAdmin(principal)) {
      throw new ForbiddenException("Only global admins can reactivate branches");
    }
    const actorUserId = principal?.userId ?? req?.user?.sub ?? null;
    return this.branches.setActive(id, true, actorUserId);
  }

  @Permissions(PERM.BRANCH_DELETE)
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    const principal = req.principal;
    if (!isGlobalAdmin(principal)) {
      throw new ForbiddenException("Only global admins can delete branches");
    }
    const actorUserId = principal?.userId ?? req?.user?.sub ?? null;
    return this.branches.remove(id, actorUserId);
  }
}
