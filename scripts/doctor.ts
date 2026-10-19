// npm run doctor            -> checks env + Supabase/Prisma connection + migrations + admin user
// npm run doctor -- --gen   -> prints fresh AUTH_SECRET / CARRIER_CREDENTIAL_ENCRYPTION_KEY / ADMIN_ROUTE_SECRET values
import { randomBytes } from "crypto";
import { prisma } from "../lib/db/prisma";
const ok = (m: string) => console.log("  OK  ", m); const bad = (m: string) => { console.log("  FAIL", m); fails++; }; let fails = 0;
async function main() {
  if (process.argv.includes("--gen")) { console.log(`AUTH_SECRET=${randomBytes(32).toString("base64url")}\nCARRIER_CREDENTIAL_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\nADMIN_ROUTE_SECRET=${Math.floor(100000 + Math.random() * 900000)}\nCRON_SECRET=${randomBytes(24).toString("base64url")}`); return; }
  for (const k of ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "ADMIN_ROUTE_SECRET", "CARRIER_CREDENTIAL_ENCRYPTION_KEY"]) process.env[k] ? ok(`${k} set`) : bad(`${k} missing`);
  if ((process.env.AUTH_SECRET ?? "").length < 32) bad("AUTH_SECRET should be 32+ chars");
  if (Buffer.from(process.env.CARRIER_CREDENTIAL_ENCRYPTION_KEY ?? "", "base64").length !== 32) bad("CARRIER_CREDENTIAL_ENCRYPTION_KEY must be 32 bytes, base64");
  if (/pooler|:6543/.test(process.env.DATABASE_URL ?? "") && !/pgbouncer=true/.test(process.env.DATABASE_URL ?? "")) bad("Supabase pooled DATABASE_URL needs ?pgbouncer=true");
  try { await prisma.$queryRaw`select 1`; ok("database reachable"); } catch (e: any) { bad(`database unreachable: ${String(e.message).split("\n").pop()}`); return; }
  try { const n = await prisma.adminUser.count(); ok("migrations applied"); n ? ok(`${n} admin user(s)`) : bad("no admin yet: run npm run create-admin"); } catch { bad("tables missing: run npx prisma migrate deploy"); }
}
main().finally(async () => { await prisma.$disconnect(); console.log(fails ? `\n${fails} problem(s) found.` : "\nAll checks passed."); });
