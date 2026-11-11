"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { assets, fandomAssets } from "@/data/editorial";
import { EditorialImage } from "./editorial-image";
import { useWorkspace } from "./workspace-provider";
import { PageIntro } from "./page-design";
export function CreditsScreen() {
  const { t, locale } = useWorkspace();
  const [limit, setLimit] = useState(24);
  return (
    <>
      <PageIntro
        eyebrow={t.design.creditsEyebrow}
        title={t.photoCredits}
        description={t.design.creditsHint}
        motif="fandom"
      />
      <div className="credits-grid">
        {Object.values(assets).map((asset) => (
          <article key={asset.id}>
            <EditorialImage
              asset={asset}
              sizes="(max-width: 600px) 90vw, 30vw"
            />
            <h2>{asset.author}</h2>
            <p>{asset.alt[locale]}</p>
            <a
              href={asset.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t.viewSource}
              <ArrowUpRight size={15} />
            </a>
            <a
              href={asset.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {asset.license}
            </a>
          </article>
        ))}
      </div>
      <h2>{t.fandoms}</h2>
      <div className="credits-grid">
        {Object.entries(fandomAssets)
          .filter(([, asset]) => asset.source)
          .slice(0, limit)
          .map(([id, asset]) => (
            <article key={asset.id}>
              <Link href={`/fandoms/${id}`}>
                <EditorialImage asset={asset} />
              </Link>
              <h3>{asset.work}</h3>
              <p>{asset.author}</p>
              {asset.licenseUrl ? (
                <a className="text-link" href={asset.licenseUrl}>
                  {asset.license}
                </a>
              ) : (
                <p>{asset.license}</p>
              )}
              <p className="form-hint">{t.design.artworkChanges}</p>
              <a
                className="text-link"
                href={asset.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.viewSource}
                <ArrowUpRight size={15} />
              </a>
            </article>
          ))}
      </div>
      {limit <
        Object.values(fandomAssets).filter((asset) => asset.source).length && (
        <button
          className="button button-secondary"
          onClick={() => setLimit(limit + 24)}
        >
          {t.showMore}
        </button>
      )}
    </>
  );
}
