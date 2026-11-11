import type { LegalDoc } from "@/content/legal/types";
import { LegalPage } from "./legal-page";
import { missingOwnerFacts } from "@/content/legal/owner";
import { russianLegalDoc } from "@/content/legal/ru";

/** Server side of a legal page: renders the sections, frames them on the client. */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const ru = russianLegalDoc(doc);
  const frame = ({ sections, ...meta }: LegalDoc) => ({
    ...meta,
    sections: sections.map(({ id, title }) => ({ id, title })),
  });
  const body = (document: LegalDoc) =>
    document.sections.map((section) => (
      <section
        key={section.id}
        id={section.id}
        aria-labelledby={`${section.id}-title`}
      >
        <h2 id={`${section.id}-title`}>
          <a href={`#${section.id}`} className="legal-anchor">
            {section.title}
          </a>
        </h2>
        {section.body}
      </section>
    ));
  return (
    <LegalPage
      doc={frame(doc)}
      russian={{ doc: frame(ru), children: body(ru) }}
      missingFacts={doc.descriptionOnly ? 0 : missingOwnerFacts().length}
    >
      {body(doc)}
    </LegalPage>
  );
}
