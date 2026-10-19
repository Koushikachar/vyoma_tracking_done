import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
export function hashPassword(pw: string) {
  const salt = randomBytes(16); return `s1$${salt.toString("base64")}$${scryptSync(pw, salt, 64, { N: 16384 }).toString("base64")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [, s, h] = stored.split("$"); if (!s || !h) return false;
  const a = scryptSync(pw, Buffer.from(s, "base64"), 64, { N: 16384 }); const b = Buffer.from(h, "base64");
  return a.length === b.length && timingSafeEqual(a, b);
}
