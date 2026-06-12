import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand-icon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aura - your shopping concierge",
    short_name: "Aura",
    description:
      "A warm, visual AI concierge for shopping on Kapruka, Sri Lanka's largest store - in Sinhala, Tanglish or English.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND.bg,
    theme_color: BRAND.bg,
    categories: ["shopping", "lifestyle"],
    lang: "en-LK",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180", purpose: "maskable" },
    ],
  };
}
