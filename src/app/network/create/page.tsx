import { currentAccount } from "@/lib/supabase/server";
import { NetworkCreate } from "@/components/network-rooms";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fandom?: string; format?: string; import?: string }>;
}) {
  const { fandom, format, import: importUrl } = await searchParams;
  // Only an https link is carried into the form; the server checks it again.
  const playlist =
    typeof importUrl === "string" &&
    importUrl.length <= 2048 &&
    /^https:\/\/\S+$/.test(importUrl)
      ? importUrl
      : undefined;
  const { configured, user } = await currentAccount();
  return (
    <NetworkCreate
      configured={configured}
      signedIn={!!user}
      initialFandom={fandom}
      initialFormat={format === "music" ? "music" : "video"}
      importUrl={playlist}
    />
  );
}
