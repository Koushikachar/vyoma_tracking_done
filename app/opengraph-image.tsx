import { ImageResponse } from "next/og";
export const alt = "VYOMA ROUTE: One Tracking ID. Every Journey."; export const size = { width: 1200, height: 630 }; export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#070b14,#0f2a3a)", color: "#e2e8f0" }}>
    <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#22d3ee" }}>VYOMA ROUTE</div>
    <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 24 }}>Track Every Shipment.</div>
    <div style={{ display: "flex", fontSize: 40, marginTop: 16, color: "#94a3b8" }}>One Tracking ID. Every Journey.</div></div>, size);
}
