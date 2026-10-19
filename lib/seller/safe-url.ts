import { lookup } from "dns/promises";
import { isIP } from "net";
const priv = (ip: string) => /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) || ip === "::1" || /^(fc|fd|fe80)/i.test(ip) || ip.startsWith("::ffff:");
// Seller-supplied store URLs are fetched by our server, so only public https hosts are allowed (blocks localhost, private networks, cloud metadata).
export async function publicHttpsOrigin(input: string) {
  let u: URL; try { u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); } catch { throw new Error("Enter a valid store address."); }
  if (u.protocol !== "https:") throw new Error("The store address must start with https://"); if (u.username || u.password || (u.port && u.port !== "443")) throw new Error("Please use the plain store address.");
  const host = u.hostname; if (isIP(host) ? priv(host) : (await lookup(host, { all: true }).catch(() => [])).some(a => priv(a.address)) || !host.includes(".")) throw new Error("That address cannot be used.");
  return u.origin;
}
