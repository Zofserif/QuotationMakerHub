import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function createClientAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashClientAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isClientTokenHashMatch(token: string, expectedHash: string) {
  const actual = Buffer.from(hashClientAccessToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function defaultTokenExpiry(days = 14) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}
