/**
 * Onborda guided-tour definitions. Each `selector` targets an `id` rendered in
 * the chat shell (see the `id="tour-*"` anchors in components/aura/aura-chat.tsx).
 * Kept as plain data so it can be imported by the (client) TourProvider without
 * pulling in any component code.
 */
import type { Step } from "onborda";

export const MAIN_TOUR = "main";

type Tour = { tour: string; steps: Step[] };

export const tours: Tour[] = [
  {
    tour: MAIN_TOUR,
    steps: [
      {
        icon: "💬",
        title: "Just talk to Aura",
        content:
          "Tell Aura what you need in plain English, Sinhala or Tanglish — “a birthday cake to Kandy under Rs 5,000”. Tap 🎤 to speak or 📷 to search by a photo.",
        selector: "#tour-composer",
        side: "top",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 16,
      },
      {
        icon: "🛍️",
        title: "Your basket",
        content:
          "Add anything you like as you browse, then check out everything together in one secure click-to-pay link.",
        selector: "#tour-basket",
        side: "bottom",
        showControls: true,
        pointerPadding: 6,
        pointerRadius: 999,
      },
      {
        icon: "👑",
        title: "Aura Prestige",
        content:
          "This is your status. The more you shop, the more Aura does for you — proactive reminders, delivery confidence, even autonomous gifting. Tap the badge to see the ladder.",
        selector: "#tour-tier",
        side: "bottom",
        showControls: true,
        pointerPadding: 6,
        pointerRadius: 999,
      },
      {
        icon: "⚙️",
        title: "New chat, share & theme",
        content: "Start a fresh chat, share this one as a link, or switch between light and dark here.",
        selector: "#tour-menu",
        side: "bottom",
        showControls: true,
        pointerPadding: 6,
        pointerRadius: 999,
      },
      {
        icon: "👤",
        title: "Your details & guide",
        content:
          "Save your name, address and preferences once — Aura won’t ask twice. The full guide lives here too whenever you need it.",
        selector: "#tour-profile",
        side: "bottom",
        showControls: true,
        pointerPadding: 6,
        pointerRadius: 999,
      },
    ],
  },
];
