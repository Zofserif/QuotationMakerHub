import { createHash } from "crypto";

export async function renderQuotePdf(input: {
  quoteId: string;
  quoteVersionId: string;
  requestedByClerkUserId: string;
}): Promise<{
  bytes: Buffer;
  sha256: string;
}> {
  const bytes = Buffer.from(
    `%PDF-1.4\n% Quote ${input.quoteId} version ${input.quoteVersionId}\n%%EOF\n`,
  );

  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
