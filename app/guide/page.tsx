import type { Metadata } from "next";
import { GuideContent } from "@/components/aura/guide-content";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "What Aura can do, how it works, demo conversations and tips. A warm, visual AI concierge for shopping on Kapruka — in Sinhala, Tanglish or English.",
};

export default function GuidePage() {
  return <GuideContent />;
}
