import { about } from "./about";
import { contact } from "./contact";
import { cookies } from "./cookies";
import { copyright } from "./copyright";
import { guidelines } from "./guidelines";
import { privacy } from "./privacy";
import { terms } from "./terms";
import type { LegalDoc, LegalSlug } from "./types";

/** Footer order. Routes are stable: /terms, /privacy, … */
export const legalDocs: LegalDoc[] = [
  terms,
  privacy,
  cookies,
  guidelines,
  copyright,
  contact,
  about,
];
export const legalSlugs = legalDocs.map((doc) => doc.slug);
export const legalDoc = (slug: LegalSlug) =>
  legalDocs.find((doc) => doc.slug === slug)!;
