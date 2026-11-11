"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { LegalDoc, LegalSlug } from "@/content/legal/types";
import { useWorkspace } from "./workspace-provider";

/** What the client frame needs: everything but the section bodies. */
export type LegalFrame = Omit<LegalDoc, "sections"> & {
  sections: { id: string; title: string }[];
};

export const legalOrder: LegalSlug[] = [
  "terms",
  "privacy",
  "cookies",
  "guidelines",
  "copyright",
  "contact",
  "about",
];

const formatDate = (iso: string, locale: "ru" | "en") =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

/**
 * Bilingual frame; both document bodies are composed on the server.
 */
export function LegalPage({
  doc: englishDoc,
  missingFacts,
  children: englishChildren,
  russian,
}: {
  doc: LegalFrame;
  /** The sections, rendered on the server (LegalSections). */
  children: ReactNode;
  /** How many owner facts are still placeholders on the site. */
  missingFacts: number;
  russian: { doc: LegalFrame; children: ReactNode };
}) {
  const { t, locale } = useWorkspace();
  const doc = locale === "ru" ? russian.doc : englishDoc;
  const children = locale === "ru" ? russian.children : englishChildren;
  const l = t.legal;
  const showToc = doc.sections.length > 4;
  return (
    <article className="legal-page" lang={locale}>
      <header className="legal-hero">
        <p className="eyebrow" lang={locale}>
          <FileText size={14} aria-hidden="true" />
          {doc.informational ? l.infoEyebrow : l.eyebrow}
        </p>
        <h1>{doc.title}</h1>
        <p className="legal-summary">{doc.summary}</p>
        <dl className="legal-meta" lang={locale}>
          {!doc.informational && (
            <div>
              <dt>{l.version}</dt>
              <dd>
                {doc.version} {missingFacts > 0 && `(${l.draft})`}
              </dd>
            </div>
          )}
          <div>
            <dt>{l.updated}</dt>
            <dd>
              <time dateTime={doc.updated}>
                {formatDate(doc.updated, locale)}
              </time>
            </dd>
          </div>
        </dl>
        {missingFacts > 0 && (
          <p className="legal-draft" role="note" lang={locale}>
            {l.draftNotice}
          </p>
        )}
      </header>
      <div className={showToc ? "legal-layout" : "legal-layout legal-no-toc"}>
        {showToc && (
          <nav className="legal-toc" aria-labelledby="legal-toc-title">
            <h2 id="legal-toc-title" lang={locale}>
              {l.contents}
            </h2>
            <ol>
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="legal-body">
          {children}
          <nav className="legal-related" aria-label={l.related} lang={locale}>
            <h2>{l.related}</h2>
            <ul>
              {legalOrder
                .filter((slug) => slug !== doc.slug)
                .map((slug) => (
                  <li key={slug}>
                    <Link href={`/${slug}`}>{t.legalLinks[slug]}</Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </div>
    </article>
  );
}
