import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";

@Injectable()
export class AuditService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  /**
   * Writes an audit event.
   *
   * Pass `db` when you want the audit write to be part of the same Prisma $transaction.
   * (If omitted, it uses the default PrismaClient instance.)
   */
  async log(
    evt: {
    branchId?: string | null;
    actorUserId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    meta?: any;
    },
    db?: any,
  ) {
    const isProd = process.env.NODE_ENV === "production";
    const strictDev = !isProd && process.env.AUDIT_STRICT_ACTOR !== "false";

    const actor = (evt.actorUserId ?? "").trim();
    const action = String(evt.action ?? "").trim();

    // System/automation actions that may legitimately not have an actor
    const isSystem =
      evt?.meta?.system === true ||
      /^SYS_|^SYSTEM_|^SEED_|^MIG_|^MIGRATION_|^CRON_|^JOB_|^HEALTH_/i.test(action);

    if (strictDev && !actor && !isSystem) {
      throw new Error(
        `AUDIT_STRICT_ACTOR: Missing actorUserId for action="${action}" entity="${evt.entity}" entityId="${evt.entityId ?? ""}". ` +
          `Pass actorUserId (req.principal.userId) or set meta.system=true for true system events.`,
      );
    }

    const client = db ?? this.prisma;

    return client.auditEvent.create({
      data: {
        branchId: evt.branchId ?? null,
        actorUserId: actor || null,
        action: evt.action,
        entity: evt.entity,
        entityId: evt.entityId ?? null,
        meta: evt.meta ?? undefined,
      },
    });
  }
}
