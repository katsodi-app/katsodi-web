"use client";
import { useWorkspace } from "@/components/workspace-provider";
import { PageIntro, StatePanel } from "@/components/page-design";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useWorkspace();
  return (
    <>
      <PageIntro
        eyebrow={t.design.errorEyebrow}
        title={t.error}
        description={t.design.errorHint}
      />
      <StatePanel
        title={t.design.errorEyebrow}
        description={t.design.errorHint}
        motif="orbit"
      >
        <button onClick={reset} className="button button-primary">
          {t.retry}
        </button>
        <Link href="/home" className="button button-secondary">
          {t.returnHome}
        </Link>
      </StatePanel>
    </>
  );
}
