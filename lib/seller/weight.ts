// Chargeable weight = the higher of actual and volumetric (L x W x H in cm / divisor), rounded UP to the courier slab. Use your own contract values.
export function chargeableWeight(l: number, w: number, h: number, actual: number, divisor: number, slab: number) {
  const vol = (l * w * h) / divisor; const top = Math.max(actual, vol);
  return { vol, charge: Math.round(Math.ceil(top / slab - 1e-9) * slab * 1000) / 1000 };
}
