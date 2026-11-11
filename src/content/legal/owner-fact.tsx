import { owner, ownerLabels, ownerLabelsRu, type OwnerFacts } from "./owner";

/**
 * Renders an owner-provided fact, or a clearly marked placeholder when the
 * owner has not supplied it yet. Emails render as mailto links.
 */
export function OwnerFact({
  field,
  locale = "en",
}: {
  field: keyof OwnerFacts;
  locale?: "ru" | "en";
}) {
  const value = owner[field];
  if (value === null)
    return (
      <mark className="legal-placeholder" data-owner-fact={field}>
        [
        {locale === "ru"
          ? "Владелец должен указать"
          : "To be provided by the owner"}
        : {locale === "ru" ? ownerLabelsRu[field] : ownerLabels[field]}]
      </mark>
    );
  if (field.endsWith("Email")) return <a href={`mailto:${value}`}>{value}</a>;
  if (field === "operatingCountry" && locale === "ru" && value === "Poland")
    return <>Польша</>;
  return <>{value}</>;
}
