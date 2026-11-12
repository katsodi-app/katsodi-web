import type { Metadata } from "next";
import { Caveat, Oswald } from "next/font/google";
import { OverviewScreen } from "@/components/overview-screen";

// Display faces for this page only (both OFL, both with Cyrillic). next/font
// self-hosts them, so they load from Katsodi's own origin like Manrope.
const display = Oswald({
  subsets: ["latin", "cyrillic"],
  weight: "700",
  display: "swap",
  variable: "--font-display",
});
const hand = Caveat({
  subsets: ["latin", "cyrillic"],
  weight: "500",
  display: "swap",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Katsodi — Обзор проекта / Project overview",
  description:
    "Смотреть, слушать и общаться вместе: комнаты, музыка, фандомы и демонстрации. Открытый код. Watch, listen and spend time together — open source.",
};
export default function Page() {
  return (
    <div className={`${display.variable} ${hand.variable}`}>
      <OverviewScreen />
    </div>
  );
}
