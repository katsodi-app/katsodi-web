import { FandomScreen } from "@/components/fandom-screen";
import { communityFandoms } from "@/lib/server/community-fandoms";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  return (
    <FandomScreen
      key={`${q || ""}-${category || ""}`}
      initialQuery={q || ""}
      initialCategory={category}
      community={await communityFandoms()}
    />
  );
}
