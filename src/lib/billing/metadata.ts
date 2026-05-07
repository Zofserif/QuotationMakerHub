import { parseWorkspacePlan, type WorkspacePlan } from "@/lib/billing/plans";

export type ClerkMetadata = Record<string, unknown> | null | undefined;

export type RemoteQuoteMetadata = {
  plan: WorkspacePlan;
  renewsAt?: string;
};

export function readRemoteQuoteMetadata(
  metadata: ClerkMetadata,
): RemoteQuoteMetadata {
  const remoteQuote =
    metadata && typeof metadata === "object"
      ? metadata.remoteQuote
      : undefined;

  if (!remoteQuote || typeof remoteQuote !== "object") {
    return {
      plan: "free_trial",
      renewsAt: undefined,
    };
  }

  const remoteQuoteRecord = remoteQuote as Record<string, unknown>;

  return {
    plan: parseWorkspacePlan(remoteQuoteRecord.plan),
    renewsAt: parseIsoDate(remoteQuoteRecord.renewsAt),
  };
}

export function buildRemoteQuotePrivateMetadata(input: RemoteQuoteMetadata) {
  return {
    remoteQuote: {
      plan: input.plan,
      ...(input.renewsAt ? { renewsAt: input.renewsAt } : {}),
    },
  };
}

function parseIsoDate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
