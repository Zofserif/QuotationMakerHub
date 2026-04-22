import { randomUUID } from "crypto";

import type { AuditEvent } from "@/lib/quotes/types";

export function createAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">) {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  } satisfies AuditEvent;
}
