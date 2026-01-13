import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
@Injectable()
export class OutboxService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}
  async enqueue(topic: string, payload: any, key?: string | null) {
    return this.prisma.outboxEvent.create({ data: { topic, payload, key: key ?? null } });
  }
}
