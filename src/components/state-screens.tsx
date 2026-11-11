"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { PageIntro, StatePanel } from "./page-design";

export function Empty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <StatePanel title={title} description={description}>
      {href && action && (
        <Link href={href} className="button button-primary">
          {action}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </StatePanel>
  );
}

export function MissingScreen() {
  const { t } = useWorkspace();
  return (
    <>
      <PageIntro
        eyebrow={t.design.errorEyebrow}
        title={t.notFound}
        description={t.design.missingHint}
      />
      <StatePanel title={t.design.emptyHint} motif="orbit" code="404">
        <Link href="/home" className="button button-primary">
          {t.returnHome}
        </Link>
      </StatePanel>
    </>
  );
}
export function AccountScreen() {
  const { t } = useWorkspace();
  return (
    <>
      <Empty title={t.login} description={t.loginHint} />
      <Link href="/home" className="button button-primary">
        {t.returnHome}
      </Link>
    </>
  );
}
