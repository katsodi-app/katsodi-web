"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { saveConsent, useConsent } from "@/lib/consent";
import { useWorkspace } from "./workspace-provider";

/**
 * Renders a third-party player or website only after the visitor agreed to
 * embedded media (on the banner, on /cookies, or here). "Load once" shows it
 * for this view without remembering the choice.
 */
export function ExternalMedia({
  provider,
  children,
  className = "external-media-gate",
}: {
  /** Shown to the visitor: "YouTube", "spotify.com"… */
  provider: string;
  children: ReactNode;
  className?: string;
}) {
  const consent = useConsent();
  const [once, setOnce] = useState(false);
  const { t } = useWorkspace();
  const c = t.consent;
  if (consent?.externalMedia || once) return <>{children}</>;
  return (
    <div className={className} role="group" aria-label={c.gateTitle}>
      <ShieldCheck size={30} aria-hidden="true" />
      <h3>{c.gateTitle}</h3>
      <p>{c.gateText.replace("{provider}", provider)}</p>
      <div className="external-media-actions">
        <button
          type="button"
          className="button button-primary button-small"
          onClick={() => setOnce(true)}
        >
          {c.loadOnce}
        </button>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => saveConsent(true)}
        >
          {c.alwaysAllow}
        </button>
      </div>
      <Link href="/cookies#preferences" className="text-link">
        {c.learnMore}
      </Link>
    </div>
  );
}

export function hostLabel(src: string) {
  try {
    return new URL(src).hostname.replace(/^www\./, "");
  } catch {
    return src;
  }
}
