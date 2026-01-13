import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";

export type Principal = {
  userId: string;
  email: string;
  name: string;
  branchId: string | null;
  roleCode: string | null;
  roleScope: "GLOBAL" | "BRANCH" | null;
  roleVersionId: string | null;
  permissions: string[];
};

@Injectable()
export class AccessPolicyService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) { }

  async loadPrincipalByEmail(emailRaw: string): Promise<Principal | null> {
    const email = (emailRaw || "").trim().toLowerCase();
    if (!email) return null;

    const u = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roleVersion: {
          include: {
            roleTemplate: true,
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!u) return null;

    const perms = (u.roleVersion?.permissions || []).map(
      (rp: { permission: { code: string } }) => rp.permission.code,
    );

    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      branchId: u.branchId ?? null,
      roleCode: u.roleVersion?.roleTemplate?.code ?? u.role ?? null,
      roleScope: (u.roleVersion?.roleTemplate?.scope as any) ?? null,
      roleVersionId: u.roleVersionId ?? null,
      permissions: perms,
    };
  }

  hasAll(principal: Principal, required: string[]) {
    if (!required?.length) return true;
    const set = new Set(principal.permissions);
    return required.every((p) => set.has(p));
  }
}
