import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "VYOMA ROUTE", short_name: "VYOMA", description: "One Tracking ID. Every Journey.", start_url: "/", display: "standalone", background_color: "#070b14", theme_color: "#070b14",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
