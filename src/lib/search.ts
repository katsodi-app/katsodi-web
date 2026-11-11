/** Literal, accent-insensitive, token-based search shared by every catalogue. */
export function searchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(
  query: string,
  ...values: (string | null | undefined)[]
): boolean {
  const text = searchText(values.filter(Boolean).join(" "));
  return searchText(query)
    .split(" ")
    .every((token) => text.includes(token));
}

export type SearchResult = {
  id: string;
  type: "room" | "fandom" | "music";
  title: string;
  subtitle: string;
  href: string;
  art?: string;
  fandomId?: string | null;
};
