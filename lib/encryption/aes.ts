import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
function key() {
  const k = process.env.CARRIER_CREDENTIAL_ENCRYPTION_KEY;
  if (!k) throw new Error("CARRIER_CREDENTIAL_ENCRYPTION_KEY not set");
  const b = Buffer.from(k, "base64");
  if (b.length !== 32) throw new Error("Key must be 32 bytes, base64 encoded");
  return b;
}
// Output: iv.tag.ciphertext (base64). Never return decrypted values to the browser.
export function encrypt(plain: string) {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString("base64")).join(".");
}
export function decrypt(payload: string) {
  const [iv, tag, ct] = payload.split(".").map(s => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
