import { ImageResponse } from "next/og";
import { auraBloomDataUrl } from "@/lib/brand-icon";

// iOS home-screen icon. Full-bleed tile (iOS applies its own rounded mask).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img width={180} height={180} src={auraBloomDataUrl({ size: 180, rounded: false })} alt="" />
      </div>
    ),
    { ...size },
  );
}
