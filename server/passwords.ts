/**
 * Password hashing (PBKDF2-HMAC-SHA512, async).
 *
 * Current format:  pbkdf2$<iterations>$<saltHex>$<hashHex>
 * Legacy format:   <saltHex>:<hashHex>   (10,000 iterations) - still verified, upgraded on next login.
 */

import crypto from "crypto";
import { promisify } from "util";

const pbkdf2 = promisify(crypto.pbkdf2);

export const PBKDF2_ITERATIONS = 210_000;
const LEGACY_ITERATIONS = 10_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash.toString("hex")}`;
}

interface ParsedHash {
  iterations: number;
  salt: string;
  hash: Buffer;
  legacy: boolean;
}

const HEX = /^[0-9a-f]+$/i;

function parseStoredHash(stored: string): ParsedHash | null {
  if (!stored) return null;
  if (stored.startsWith("pbkdf2$")) {
    const parts = stored.split("$");
    if (parts.length !== 4) return null;
    const iterations = Number.parseInt(parts[1], 10);
    if (!Number.isInteger(iterations) || iterations < 1000 || iterations > 10_000_000) return null;
    if (!HEX.test(parts[2]) || !HEX.test(parts[3])) return null;
    return { iterations, salt: parts[2], hash: Buffer.from(parts[3], "hex"), legacy: false };
  }
  const legacy = stored.split(":");
  if (legacy.length === 2 && HEX.test(legacy[0]) && HEX.test(legacy[1])) {
    return { iterations: LEGACY_ITERATIONS, salt: legacy[0], hash: Buffer.from(legacy[1], "hex"), legacy: true };
  }
  return null;
}

export interface VerifyResult {
  valid: boolean;
  /** True when the stored hash uses an outdated format/iteration count and should be re-hashed. */
  needsRehash: boolean;
}

export async function verifyPassword(password: string, stored: string): Promise<VerifyResult> {
  const parsed = parseStoredHash(stored);
  if (!parsed || parsed.hash.length === 0) {
    await burnVerifyTime(password);
    return { valid: false, needsRehash: false };
  }
  const candidate = await pbkdf2(password, parsed.salt, parsed.iterations, parsed.hash.length, DIGEST);
  const valid = candidate.length === parsed.hash.length && crypto.timingSafeEqual(candidate, parsed.hash);
  return { valid, needsRehash: valid && (parsed.legacy || parsed.iterations < PBKDF2_ITERATIONS) };
}

let dummyHash: Promise<string> | null = null;

/**
 * Performs a full-cost hash computation so that "unknown user" and "wrong password" take the same time
 * (prevents user enumeration through response timing).
 */
export async function burnVerifyTime(password: string): Promise<void> {
  if (!dummyHash) dummyHash = hashPassword(crypto.randomBytes(16).toString("hex"));
  const parsed = parseStoredHash(await dummyHash);
  if (!parsed) return;
  await pbkdf2(password, parsed.salt, parsed.iterations, parsed.hash.length, DIGEST);
}
