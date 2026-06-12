import type { Metadata } from "next";
import { TechContent } from "@/components/aura/tech-content";

export const metadata: Metadata = {
  title: "Under the hood",
  description:
    "How Aura works behind the scenes — the architecture, models and data flow behind the AI shopping concierge: Next.js 16, Vercel AI SDK 6, Groq, the Kapruka MCP, Voyage embeddings and Supabase pgvector.",
};

export default function TechPage() {
  return <TechContent />;
}
