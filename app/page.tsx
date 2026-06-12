import { AuthProvider } from "@/components/auth/auth-provider";
import { AuraChat } from "@/components/aura/aura-chat";
import { Analytics } from "@vercel/analytics/react";

export default function Home() {
  return (
    <AuthProvider>
      <AuraChat />
      <Analytics />
    </AuthProvider>
  );
}
