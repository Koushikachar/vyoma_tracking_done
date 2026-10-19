import { createHmac, randomBytes } from "crypto";
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const newSecret = () => { let o = "", bits = ""; for (const b of randomBytes(20)) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i + 5 <= bits.length; i += 5) o += A[parseInt(bits.slice(i, i + 5), 2)]; return o; };
const decode = (s: string) => { let bits = ""; for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, "0");
  const out: number[] = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
export function totp(secret: string, t = Date.now()) {
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = createHmac("sha1", decode(secret)).update(ctr).digest(); const o = h[19] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}
export const verifyTotp = (secret: string, code: string, t = Date.now()) =>
  [-1, 0, 1].some(w => totp(secret, t + w * 30000) === code);
