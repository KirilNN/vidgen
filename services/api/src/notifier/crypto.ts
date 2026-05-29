/**
 * services/api/notifier/crypto — webhook secret encryption.
 *
 * Webhook secrets are HMAC keys handed out to subscribers when they
 * register a webhook. Two requirements drive the storage shape:
 *
 *   1. The plaintext secret must be returned exactly ONCE, at register
 *      time. We never expose it again — not in GET /webhooks, not in
 *      logs, not in error messages.
 *   2. The fan-out path needs to RECOVER the plaintext when an event
 *      fires, to compute the HMAC signature. So plain hashing won't
 *      work — we need symmetric encryption.
 *
 * Implementation: AES-256-GCM with a 96-bit random IV, output encoded
 * as `<iv>:<authTag>:<ciphertext>` (all base64url). The key is either
 * `WEBHOOK_SECRET_ENCRYPTION_KEY` (64 hex chars) or, when blank,
 * derived from `APP_SECRET` via SHA-256 so dev workflows just work.
 *
 * Reference: architecture.md §11 (multi-tenant), §7.2 (adapters).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm" as const;
const IV_LEN = 12;
const TAG_LEN = 16;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Resolve the 32-byte symmetric key used to encrypt webhook secrets.
 *
 * Priority:
 *   1. `WEBHOOK_SECRET_ENCRYPTION_KEY` if provided (must be 64 hex chars).
 *   2. SHA-256(`APP_SECRET`) — deterministic per environment, lets dev
 *      operators not have to manage a second secret.
 *
 * Throws if neither is usable so callers fail at boot, not at the first
 * webhook registration.
 */
export function resolveEncryptionKey(webhookKey: string | undefined, appSecret: string): Buffer {
  if (webhookKey && webhookKey.length > 0) {
    if (!/^[0-9a-fA-F]{64}$/.test(webhookKey)) {
      throw new Error("WEBHOOK_SECRET_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
    }
    return Buffer.from(webhookKey, "hex");
  }
  if (!appSecret || appSecret.length < 32) {
    throw new Error("Cannot derive webhook encryption key: APP_SECRET missing or too short");
  }
  return createHash("sha256").update(appSecret).digest();
}

/**
 * Encrypt a webhook secret for at-rest storage.
 *
 * Output format: `<iv_b64url>.<tag_b64url>.<ciphertext_b64url>`. Three
 * fields, dot-separated, all base64url so the whole envelope is safe to
 * paste into shells, env files, or curl commands.
 */
export function encryptSecret(plaintext: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${b64url(iv)}.${b64url(tag)}.${b64url(ct)}`;
}

/**
 * Reverse of {@link encryptSecret}. Throws on tampered or malformed
 * input; callers should treat any failure as a hard error (it means the
 * row in Postgres is corrupt or the key has rotated without a rewrap).
 */
export function decryptSecret(envelope: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const parts = envelope.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted secret envelope");
  const [ivS, tagS, ctS] = parts;
  const iv = fromB64url(ivS!);
  const tag = fromB64url(tagS!);
  const ct = fromB64url(ctS!);
  if (iv.length !== IV_LEN) throw new Error("Invalid IV length");
  if (tag.length !== TAG_LEN) throw new Error("Invalid auth tag length");
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Generate a fresh per-webhook HMAC secret. 32 bytes encoded base64url
 * ⇒ 43 chars, no padding, URL-safe.
 */
export function generateWebhookSecret(): string {
  return b64url(randomBytes(32));
}
