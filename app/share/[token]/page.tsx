import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AuraUIMessage } from "@/lib/ai-types";
import { createClient } from "@/lib/supabase/server";
import { SharedChatView } from "@/components/aura/shared-chat-view";

// Shared links should never be indexed.
export const metadata: Metadata = {
  title: "Shared chat",
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // Public, security-definer read by exact token - returns the snapshot only.
  const { data } = await supabase.rpc("get_shared_chat", { p_token: token });
  const row = (Array.isArray(data) ? data[0] : null) as
    | { title: string; messages: AuraUIMessage[] }
    | null;
  if (!row) notFound();

  return <SharedChatView title={row.title} messages={(row.messages ?? []) as AuraUIMessage[]} />;
}
