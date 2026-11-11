"use client";
import Link from "next/link";
import { PageIntro, StatePanel } from "./page-design";
import { useWorkspace } from "./workspace-provider";
export function FriendsSignIn() {
  const { t } = useWorkspace();
  return (
    <>
      <PageIntro
        eyebrow={t.design.personalEyebrow}
        title={t.design.friends}
        description={t.friends.intro}
        motif="people"
      />
      <StatePanel title={t.friends.signIn} description="" motif="people">
        <Link href="/login?next=/friends" className="button button-primary">
          {t.network.login}
        </Link>
      </StatePanel>
    </>
  );
}
