import type { ReactNode } from "react";

export type LegalSlug =
  | "terms"
  | "privacy"
  | "cookies"
  | "guidelines"
  | "copyright"
  | "contact"
  | "about";

export type LegalSection = {
  /** Stable anchor; keep it when wording changes so links keep working. */
  id: string;
  title: string;
  body: ReactNode;
};

export type LegalDoc = {
  slug: LegalSlug;
  title: string;
  summary: string;
  /**
   * Bump on every published change. Drafts stay "0.x"; a material change to
   * the Terms or Privacy Policy needs a new major version (see Legal Pages
   * note: users are asked to accept the Terms again).
   */
  version: string;
  /** Date this text was last changed (YYYY-MM-DD). */
  updated: string;
  /** Informational pages (About, Contact) have no version or effective date. */
  informational?: boolean;
  /** Describes current implementation without displaying unprovided owner fields. */
  descriptionOnly?: boolean;
  sections: LegalSection[];
};
