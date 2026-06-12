import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand-icon";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "Aura is a warm, witty AI concierge for Kapruka, Sri Lanka's largest store. Groceries, gadgets, daily essentials or a gift - in Sinhala, Tanglish or English. It checks delivery before you fall in love with anything, then does click-to-pay checkout, all in one conversation.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aura - your shopping concierge",
    template: "%s · Aura",
  },
  description: DESCRIPTION,
  applicationName: "Aura",
  authors: [{ name: "Zayan Mohamed" }],
  creator: "Zayan Mohamed",
  category: "shopping",
  keywords: [
    "Kapruka",
    "Sri Lanka online shopping",
    "AI shopping assistant",
    "shopping concierge",
    "Sinhala",
    "Tanglish",
    "gift delivery Sri Lanka",
    "MCP",
  ],
  openGraph: {
    type: "website",
    siteName: "Aura",
    title: "Aura - your shopping concierge for Sri Lanka",
    description: DESCRIPTION,
    locale: "en_LK",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura - your shopping concierge for Sri Lanka",
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "Aura",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.bg },
    { media: "(prefers-color-scheme: dark)", color: BRAND.bgDark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
