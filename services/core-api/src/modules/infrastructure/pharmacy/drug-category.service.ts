import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InfraContextService } from "../shared/infra-context.service";
import type {
  CreateDrugCategoryDto,
  UpdateDrugCategoryDto,
} from "./dto/create-drug-category.dto";

interface CategoryTreeNode {
  id: string;
  branchId: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  _count: {
    drugs: number;
    children: number;
  };
  children?: CategoryTreeNode[];
}

@Injectable()
export class DrugCategoryService {
  constructor(private readonly ctx: InfraContextService) {}

  async listCategories(
    principal: any,
    filters: {
      branchId?: string;
      parentId?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const branchId = await this.ctx.resolveBranchId(
      principal,
      filters.branchId
    );
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 50, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { branchId };

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.q) {
      where.OR = [
        { code: { contains: filters.q, mode: "insensitive" as const } },
        { name: { contains: filters.q, mode: "insensitive" as const } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.ctx.prisma.drugCategoryNode.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: {
              drugs: true,
              children: true,
            },
          },
        },
      }),
      this.ctx.prisma.drugCategoryNode.count({ where }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getCategoryTree(principal: any, filters: { branchId?: string }) {
    const branchId = await this.ctx.resolveBranchId(
      principal,
      filters.branchId
    );

    const allCategories = await this.ctx.prisma.drugCategoryNode.findMany({
      where: { branchId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            drugs: true,
            children: true,
          },
        },
      },
    });

    const categoryMap = new Map<string, CategoryTreeNode>();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    const rootNodes: CategoryTreeNode[] = [];

    allCategories.forEach((cat) => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children!.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  async createCategory(
    principal: any,
    dto: CreateDrugCategoryDto,
    branchId?: string
  ) {
    const resolvedBranchId = await this.ctx.resolveBranchId(
      principal,
      branchId
    );

    const existing = await this.ctx.prisma.drugCategoryNode.findFirst({
      where: {
        branchId: resolvedBranchId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Drug category with code '${dto.code}' already exists in this branch`
      );
    }

    if (dto.parentId) {
      const parent = await this.ctx.prisma.drugCategoryNode.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new BadRequestException("Parent category not found");
      }

      if (parent.branchId !== resolvedBranchId) {
        throw new BadRequestException(
          "Parent category must belong to the same branch"
        );
      }
    }

    const category = await this.ctx.prisma.drugCategoryNode.create({
      data: {
        branchId: resolvedBranchId,
        code: dto.code,
        name: dto.name,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        _count: {
          select: {
            drugs: true,
            children: true,
          },
        },
      },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_CATEGORY_CREATE",
      entity: "DrugCategoryNode",
      entityId: category.id,
      branchId: resolvedBranchId,
      meta: {
        code: category.code,
        name: category.name,
      },
    });

    return category;
  }

  async updateCategory(
    principal: any,
    id: string,
    dto: UpdateDrugCategoryDto
  ) {
    const category = await this.ctx.prisma.drugCategoryNode.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException("Drug category not found");
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException("Category cannot be its own parent");
      }

      if (dto.parentId) {
        const parent = await this.ctx.prisma.drugCategoryNode.findUnique({
          where: { id: dto.parentId },
        });

        if (!parent) {
          throw new BadRequestException("Parent category not found");
        }

        if (parent.branchId !== category.branchId) {
          throw new BadRequestException(
            "Parent category must belong to the same branch"
          );
        }

        const isDescendant = await this.isDescendantOf(
          dto.parentId,
          id,
          category.branchId
        );
        if (isDescendant) {
          throw new BadRequestException(
            "Cannot set parent to a descendant category (would create circular reference)"
          );
        }
      }
    }

    const updated = await this.ctx.prisma.drugCategoryNode.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder,
      },
      include: {
        _count: {
          select: {
            drugs: true,
            children: true,
          },
        },
      },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_CATEGORY_UPDATE",
      entity: "DrugCategoryNode",
      entityId: updated.id,
      branchId: category.branchId,
      meta: { changes: dto },
    });

    return updated;
  }

  async deleteCategory(principal: any, id: string) {
    const category = await this.ctx.prisma.drugCategoryNode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            drugs: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Drug category not found");
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.children} child categories. Delete or reassign child categories first.`
      );
    }

    if (category._count.drugs > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.drugs} drugs linked. Reassign drugs first.`
      );
    }

    await this.ctx.prisma.drugCategoryNode.delete({
      where: { id },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_CATEGORY_DELETE",
      entity: "DrugCategoryNode",
      entityId: category.id,
      branchId: category.branchId,
      meta: {
        code: category.code,
        name: category.name,
      },
    });

    return { success: true };
  }

  private async isDescendantOf(
    potentialDescendantId: string,
    ancestorId: string,
    branchId: string
  ): Promise<boolean> {
    const allCategories = await this.ctx.prisma.drugCategoryNode.findMany({
      where: { branchId },
      select: { id: true, parentId: true },
    });

    const childrenMap = new Map<string, string[]>();
    allCategories.forEach((cat) => {
      if (cat.parentId) {
        if (!childrenMap.has(cat.parentId)) {
          childrenMap.set(cat.parentId, []);
        }
        childrenMap.get(cat.parentId)!.push(cat.id);
      }
    });

    const visited = new Set<string>();
    const queue = [ancestorId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === potentialDescendantId) {
        return true;
      }

      const children = childrenMap.get(currentId) || [];
      queue.push(...children);
    }

    return false;
  }
}
