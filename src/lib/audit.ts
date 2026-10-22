import { Prisma } from "@prisma/client";
import { db } from "./db";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: Prisma.InputJsonValue,
) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, data } });
}
