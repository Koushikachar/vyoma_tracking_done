// Usage: npm run create-admin -- you@example.com 'LongPassword12+' [ROLE]
import qrcode from "qrcode-terminal";
import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/password";
import { newSecret } from "../lib/auth/totp";
import { encrypt } from "../lib/encryption/aes";
import { generateCodes, hashCode } from "../lib/auth/recovery";
async function main() {
  const [email, pw, role = "SUPER_ADMIN"] = process.argv.slice(2);
  if (!email || !pw || pw.length < 12) throw new Error("Usage: create-admin <email> <password, 12+ chars> [ROLE]");
  const secret = newSecret(); const codes = generateCodes(); const e = email.toLowerCase();
  const data = { passwordHash: hashPassword(pw), totpSecretEnc: encrypt(secret), recoveryHashes: codes.map(hashCode), role: role as any, failedLogins: 0, lockedUntil: null };
  await prisma.adminUser.upsert({ where: { email: e }, update: data, create: { email: e, ...data } });
  const uri = `otpauth://totp/VYOMA%20ROUTE:${encodeURIComponent(e)}?secret=${secret}&issuer=VYOMA%20ROUTE`;
  console.log("\nScan this QR code with Google Authenticator / Authy / 1Password:\n");
  qrcode.generate(uri, { small: true });
  console.log(`\nCan't scan? Enter this setup key manually (time-based): ${secret}`);
  console.log(`\nRecovery codes (each works once, shown only now):\n  ${codes.join("\n  ")}\n\nAdmin ready: ${e}`);
}
main().finally(() => prisma.$disconnect());
