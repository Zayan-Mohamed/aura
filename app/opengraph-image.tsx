import { ImageResponse } from "next/og";
import { auraBloomDataUrl, BRAND } from "@/lib/brand-icon";

// Social share card (Open Graph + Twitter). 1200x630 is the universal size.
export const alt = "Aura — your AI shopping concierge for Kapruka, Sri Lanka";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          color: BRAND.ink,
          background: BRAND.bg,
          backgroundImage: `radial-gradient(900px 500px at 78% -10%, ${BRAND.goldA}55, transparent), radial-gradient(700px 500px at 8% 110%, ${BRAND.goldB}33, transparent)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <img width={84} height={84} src={auraBloomDataUrl({ size: 84, rounded: true })} alt="" />
          <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>Aura</span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, maxWidth: 940, letterSpacing: -2 }}>
            Your shopping concierge for Sri Lanka
          </span>
          <span style={{ fontSize: 34, color: "#6B6157", maxWidth: 880, lineHeight: 1.3 }}>
            Groceries, gadgets or a gift — found, checked for delivery, and paid.
            In Sinhala, Tanglish or English.
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 600,
              color: "#fff",
              background: BRAND.goldB,
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            Powered by Kapruka MCP
          </span>
          <span style={{ fontSize: 25, color: "#8A8175" }}>kapruka.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
