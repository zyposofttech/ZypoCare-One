import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { Prisma } from "@zypocare/db";
import type { Principal } from "../auth/access-policy.service";

type NotificationSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
type NotificationStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type CreateNotificationInput = {
  branchId: string;
  toUserId?: string | null;
  // Back-compat alias.
  recipientUserId?: string | null;
  title: string;
  message?: string | null;
  severity?: NotificationSeverity;
  status?: NotificationStatus;
  source?: string;
  entity?: string | null;
  entityId?: string | null;
  tags?: string[];
  meta?: Record<string, any> | null;
};

@Injectable()
export class NotificationsService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  /**
   * Minimal notification writer.
   *
   * Notes:
   * - Uses DB enum values (WARNING, not WARN).
   * - Intentionally keeps typing light so missing enums/types won't break compilation.
   */
  async create(_principal: Principal, input: CreateNotificationInput) {
    const severityInput = input.severity ?? "INFO";
    const severity = (severityInput === "ERROR" ? "CRITICAL" : severityInput) as any;
    const status = (input.status ?? "OPEN") as any;
    const source = (input.source ?? "SYSTEM") as any;
    const toUserId = input.toUserId ?? input.recipientUserId ?? null;

    return this.prisma.notification.create({
      data: {
        branchId: input.branchId,
        toUserId,
        title: input.title,
        message: input.message ?? null,
        severity,
        status,
        source,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        tags: input.tags ?? [],
        meta: input.meta ?? Prisma.DbNull,
      },
      select: { id: true },
    });
  }
}
