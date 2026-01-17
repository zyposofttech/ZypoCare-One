import { PrismaClient, Prisma } from "./generated/client/index.js";

export const prisma = new PrismaClient();

const LEGACY_INFRA_MODELS = new Set(["Ward", "Room", "Bed", "OT"]);
const LEGACY_WRITE_ACTIONS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

// eslint-disable-next-line @typescript-eslint/no-misused-promises
prisma.$use(async (params, next) => {
  if (process.env.ALLOW_LEGACY_INFRA_WRITES === "true") return next(params);

  const model = String(params.model || "");
  const action = String(params.action || "");

  if (LEGACY_INFRA_MODELS.has(model) && LEGACY_WRITE_ACTIONS.has(action)) {
    throw new Error(
      `Blocked legacy infrastructure write: ${model}.${action}. Use LocationNode/Unit/UnitRoom/UnitResource instead.`,
    );
  }

  return next(params);
});

export { PrismaClient, Prisma };
