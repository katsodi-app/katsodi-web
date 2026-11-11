import { AuthRoute } from "@/components/auth-route";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <AuthRoute mode="forgot" searchParams={searchParams} />;
}
