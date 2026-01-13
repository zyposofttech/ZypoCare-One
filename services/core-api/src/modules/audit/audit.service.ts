import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
@Injectable()
export class AuditService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}
  async log(evt: { branchId?: string | null; actorUserId?: string | null; action: string; entity: string; entityId?: string | null; meta?: any; }) {
    return this.prisma.auditEvent.create({ data: { branchId: evt.branchId ?? null, actorUserId: evt.actorUserId ?? null, action: evt.action, entity: evt.entity, entityId: evt.entityId ?? null, meta: evt.meta ?? undefined } });
  }
}
