/**
 * Facts only the owner can confirm. Legal pages show a visible placeholder
 * for every `null` here, so nothing is invented. Other facts (operator
 * name, jurisdiction, postal address, retention periods, hosting,
 * supervisory authority, effective date) were removed from the documents on
 * the owner's decision of 2026-11-11 instead of being shown as placeholders;
 * add a field back here and in the texts once it is known. See
 * docs/Features/Legal Pages.md.
 */
export type OwnerFacts = {
  /** Country the owner says they operate from, not a database region. */
  operatingCountry: string | null;
  supportEmail: string | null;
  privacyEmail: string | null;
  copyrightEmail: string | null;
  /** Minimum age to create an account, e.g. "16". */
  minimumAge: string | null;
};

export const owner: OwnerFacts = {
  operatingCountry: "Poland",
  supportEmail: "info.katsodi@gmail.com",
  privacyEmail: "info.katsodi@gmail.com",
  copyrightEmail: "info.katsodi@gmail.com",
  minimumAge: "16",
};

/** What each placeholder asks the owner for (shown on the pages). */
export const ownerLabels: Record<keyof OwnerFacts, string> = {
  operatingCountry: "country of operation",
  supportEmail: "support email address",
  privacyEmail: "privacy contact email address",
  copyrightEmail: "copyright notice email address",
  minimumAge: "minimum age",
};

export const ownerLabelsRu: Record<keyof OwnerFacts, string> = {
  operatingCountry: "страна управления проектом",
  supportEmail: "почта поддержки",
  privacyEmail: "почта для запросов о персональных данных",
  copyrightEmail: "почта для обращений об авторских правах",
  minimumAge: "минимальный возраст",
};

export const missingOwnerFacts = () =>
  (Object.keys(owner) as (keyof OwnerFacts)[]).filter((k) => owner[k] === null);
