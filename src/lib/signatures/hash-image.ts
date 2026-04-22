import { createHash } from "crypto";

export function hashImageBytes(bytes: Buffer | Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function dataUrlToBuffer(dataUrl: string) {
  const [, base64] = dataUrl.split(",");

  if (!base64) {
    throw new Error("Invalid data URL");
  }

  return Buffer.from(base64, "base64");
}
