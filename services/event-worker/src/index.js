import { connect, StringCodec } from "nats";
import { prisma } from "@zypocare/db";
import { log } from "@zypocare/logging";

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const POLL_MS = Number(process.env.OUTBOX_POLL_MS || "1000");
const BATCH = Number(process.env.OUTBOX_BATCH || "50");

async function main() {
  const nc = await connect({ servers: NATS_URL });
  const sc = StringCodec();
  log("info", "event-worker connected", { nats: NATS_URL });

  async function tick() {
    const now = new Date();
    const rows = await prisma.outboxEvent.findMany({
      where: { status: "PENDING", availableAt: { lte: now }, lockedAt: null },
      orderBy: { createdAt: "asc" },
      take: BATCH,
    });
    if (!rows.length) return;

    const ids = rows.map((r) => r.id);
    const lockTime = new Date();
    await prisma.outboxEvent.updateMany({
      where: { id: { in: ids }, lockedAt: null },
      data: { lockedAt: lockTime, status: "PROCESSING" },
    });

    for (const e of rows) {
      try {
        await nc.publish(e.topic, sc.encode(JSON.stringify(e.payload)));
        await prisma.outboxEvent.update({ where: { id: e.id }, data: { status: "SENT", sentAt: new Date(), error: null } });
      } catch (err) {
        const msg = err?.message || String(err);
        await prisma.outboxEvent.update({ where: { id: e.id }, data: { status: "FAILED", attempts: { increment: 1 }, error: msg, lockedAt: null } });
        log("error", "outbox publish failed", { id: e.id, topic: e.topic, error: msg });
      }
    }
  }

  while (true) {
    try { await tick(); } catch (err) { log("error", "outbox tick failed", { error: err?.message || String(err) }); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  log("error", "event-worker crashed", { error: e?.message || String(e) });
  process.exit(1);
});
