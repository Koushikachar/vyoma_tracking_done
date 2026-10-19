import { prisma } from "../lib/db/prisma";
import { track, hashId } from "../lib/tracking/service";
import { saveShipment, saveLookup } from "../lib/tracking/persist";
const S = ["ORDER","PICKED","INTRANSIT","DESTINATION","OUTFORDELIVERY","DELIVERED","ATTEMPTED","EXCEPTION","RTO","RETURNED"];
async function main() {
  for (const s of S) { const id = `VYT-${s}-1001`; const r = await track(id);
    await saveShipment(r.shipment, r.confidence);
    await saveLookup({ trackingIdHash: hashId(id), carrierCode: r.carrierCode, success: true, source: "seed", latencyMs: r.latencyMs, requestId: `seed-${s}` }); }
  console.log("Seeded", S.length, "test shipments");
}
main().finally(() => prisma.$disconnect());
