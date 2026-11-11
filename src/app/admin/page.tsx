import { notFound } from "next/navigation";
import { adminState } from "@/lib/server/community-fandoms";
import { AdminPanel } from "@/components/admin-panel";

export const metadata = { robots: { index: false, follow: false } };

/** Task 9: only the administrator gets this page; everyone else gets a 404. */
export default async function Page() {
  const state = await adminState();
  if (!state) notFound();
  return <AdminPanel state={state} />;
}
