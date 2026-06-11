import { AuthProvider } from "@/components/auth/auth-provider";
import { AuraChat } from "@/components/aura/aura-chat";

export default function Home() {
  return (
    <AuthProvider>
      <AuraChat />
    </AuthProvider>
  );
}
