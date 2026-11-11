import { myFandomRequests } from "@/lib/server/community-fandoms";
import { FandomRequestPage } from "@/components/fandom-request";

export default async function Page() {
  return <FandomRequestPage state={await myFandomRequests()} />;
}
