import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The cookie page embeds a client component; its content is not under test.
vi.mock("../../src/components/consent-banner", () => ({
  CookiePreferences: () => null,
}));
const { legalDocs } = await import("../../src/content/legal");
const { owner, missingOwnerFacts } =
  await import("../../src/content/legal/owner");
const { russianLegalDoc } = await import("../../src/content/legal/ru");

const dir = join(process.cwd(), "src/content/legal");
const sources = readdirSync(dir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => [f, readFileSync(join(dir, f), "utf8")] as const);

describe("legal documents", () => {
  it("exist at stable routes", () => {
    expect(legalDocs.map((d) => d.slug)).toEqual([
      "terms",
      "privacy",
      "cookies",
      "guidelines",
      "copyright",
      "contact",
      "about",
    ]);
    for (const doc of legalDocs)
      expect(
        existsSync(join(process.cwd(), `src/app/${doc.slug}/page.tsx`)),
        doc.slug,
      ).toBe(true);
  });

  it("have versions, real dates and unique section anchors", () => {
    for (const doc of legalDocs) {
      expect(doc.version, doc.slug).toMatch(/^\d+\.\d+$/);
      expect(doc.updated, doc.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(doc.updated))).toBe(false);
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size, doc.slug).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it("cover the current document sections", () => {
    const count = (slug: string) =>
      legalDocs.find((d) => d.slug === slug)!.sections.length;
    expect(count("terms")).toBe(15);
    expect(count("privacy")).toBe(17);
    expect(count("guidelines")).toBe(13);
    expect(count("copyright")).toBe(7);
    const cookieIds = legalDocs
      .find((d) => d.slug === "cookies")!
      .sections.map((s) => s.id);
    expect(cookieIds).toEqual(
      expect.arrayContaining(["what", "ours", "third-party", "preferences"]),
    );
  });

  it("never invent contact details or compliance claims", () => {
    for (const [file, text] of sources) {
      const content = text
        .replace(/^import .*$/gm, "")
        .replace(/\d{4}-\d{2}-\d{2}/g, "");
      expect(content, file).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
      expect(content, file).not.toMatch(/\+?\d[\d\s()-]{8,}\d/);
      expect(content, file).not.toMatch(
        /\b(fully compliant|GDPR[- ]compliant|certified|end-to-end encrypted|never (stored|shared|logged))\b/i,
      );
    }
  });

  it("uses confirmed contacts and country without inventing identity or hosting", () => {
    for (const key of [
      "supportEmail",
      "privacyEmail",
      "copyrightEmail",
    ] as const)
      expect(owner[key]).toBe("info.katsodi@gmail.com");
    expect(owner.operatingCountry).toBe("Poland");
    expect(owner.minimumAge).toBe("16");
    // Unprovided facts (hosting, retention, jurisdiction, address, authority,
    // effective date) were removed from the documents, not left as blanks.
    for (const key of ["operator", "hosting", "retention", "jurisdiction", "address"])
      expect(Object.keys(owner)).not.toContain(key);
    expect(missingOwnerFacts()).toEqual([]);
    const used = new Set(
      sources.flatMap(([, text]) =>
        [...text.matchAll(/<OwnerFact field="(\w+)"/g)].map((m) => m[1]),
      ),
    );
    for (const field of used) expect(Object.keys(owner)).toContain(field);
  });
  it("translates every document and preserves all section anchors and versions", () => {
    for (const doc of legalDocs) {
      const ru = russianLegalDoc(doc);
      expect(ru.sections.map((s) => s.id)).toEqual(
        doc.sections.map((s) => s.id),
      );
      expect(ru.version).toBe(doc.version);
      expect(ru.title).toMatch(/[А-Яа-я]/);
      for (const section of ru.sections)
        expect(section.title).toMatch(/[А-Яа-я]/);
    }
  });
  it("describes current privacy features in both languages without unprovided owner fields", () => {
    const privacy = legalDocs.find((doc) => doc.slug === "privacy")!;
    expect(privacy.descriptionOnly).toBe(true);
    expect(privacy.sections.map((section) => section.id)).not.toContain(
      "controller",
    );
    for (const doc of [privacy, russianLegalDoc(privacy)]) {
      const html = renderToStaticMarkup(
        createElement(
          Fragment,
          null,
          ...doc.sections.map((section) => section.body),
        ),
      );
      expect(html).not.toContain("legal-placeholder");
      expect(html).not.toMatch(/Оператор:|Operator:/);
      expect(html).toContain("info.katsodi@gmail.com");
      const age = renderToStaticMarkup(
        createElement(
          Fragment,
          null,
          doc.sections.find((section) => section.id === "children")!.body,
        ),
      );
      expect(age).toContain("16");
      expect(age).not.toContain("12");
    }
  });
});
