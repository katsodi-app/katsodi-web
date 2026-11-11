import type { Metadata } from "next";
import { OverviewScreen } from "@/components/overview-screen";
export const metadata: Metadata = {
  title: "Katsodi — Обзор проекта / Project overview",
  description:
    "Смотреть, слушать и общаться вместе. Комнаты, музыка, фандомы и демонстрации Katsodi. Watch, listen and spend time together.",
};
export default function Page() {
  return <OverviewScreen />;
}
