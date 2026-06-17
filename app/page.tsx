import { AuthProvider } from "@/components/auth/auth-provider";
import { AuraChat } from "@/components/aura/aura-chat";
import { TourProvider } from "@/components/onboarding/tour-provider";
import { Analytics } from "@vercel/analytics/react";

export default function Home() {
  return (
    <AuthProvider>
      <TourProvider>
        <AuraChat />
      </TourProvider>
      <Analytics />
    </AuthProvider>
  );
}
