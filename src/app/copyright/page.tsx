import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-sections";
import { legalDoc } from "@/content/legal";

const doc = legalDoc("copyright");
export const metadata: Metadata = {
  title: `${doc.title} · Katsodi`,
  description: doc.summary,
};

export default function Page() {
  return <LegalDocument doc={doc} />;
}
