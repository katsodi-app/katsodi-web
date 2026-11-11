import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/supabase/server";
import { safeNext } from "@/lib/server/contracts";
import { AuthForm, type AuthMode } from "./account-forms";
export async function AuthRoute({
  mode,
  searchParams,
}: {
  mode: AuthMode;
  searchParams?: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const account = await currentAccount();
  const query = await searchParams;
  if (account.user && (mode === "login" || mode === "signup"))
    redirect(safeNext(query?.next));
  return (
    <AuthForm
      mode={mode}
      configured={account.configured}
      signedIn={!!account.user}
      next={safeNext(query?.next)}
      confirmationError={query?.error === "confirmation"}
      otherBrowser={query?.error === "browser"}
      emailConfirmed={query?.notice === "confirmed"}
    />
  );
}
