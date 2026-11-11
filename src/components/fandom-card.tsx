"use client";
import { Check, Plus } from "lucide-react";
import { IntentLink as Link } from "./intent-link";
import { categoryDescriptions, fandomAsset } from "@/data/editorial";
import type { Category } from "@/lib/fandoms";
import { EditorialImage } from "./editorial-image";
import { useWorkspace } from "./workspace-provider";
export function FandomCard({
  fandom,
  featured = false,
}: {
  fandom: {
    id: string;
    name: string;
    category: Category;
    /** Community fandoms carry the requester's description. */
    description?: string | null;
  };
  featured?: boolean;
}) {
  const { t, locale, state, ready, toggleFandom } = useWorkspace();
  const selected = state.followed.includes(fandom.id);
  return (
    <article
      className={`fandom-card ${featured ? "fandom-featured" : ""} ${selected ? "is-selected" : ""}`}
    >
      <div className="fandom-art">
        <Link
          className="fandom-poster-link"
          href={`/fandoms/${fandom.id}`}
          aria-label={fandom.name}
        >
          <EditorialImage
            asset={fandomAsset(fandom)}
            // Measured card widths: ~42vw on phones, ~28vw on tablets, at
            // most ~335px on wide desktops. Featured cards may be larger.
            sizes={
              featured
                ? undefined
                : "(max-width: 600px) 45vw, (max-width: 1100px) 28vw, 340px"
            }
          />
        </Link>
        <span className="fandom-category">{t[fandom.category]}</span>
        <button
          disabled={!ready}
          className={`follow-button ${selected ? "selected" : ""}`}
          aria-label={`${selected ? t.following : t.follow}: ${fandom.name}`}
          aria-pressed={selected}
          onClick={() => toggleFandom(fandom.id)}
        >
          {selected ? <Check size={19} /> : <Plus size={19} />}
        </button>
      </div>
      <div className="fandom-info">
        <h2>
          <Link href={`/fandoms/${fandom.id}`} className="fandom-title-link">
            {fandom.name}
          </Link>
        </h2>
        <p>
          {fandom.description || categoryDescriptions[fandom.category][locale]}
        </p>
        <span className="fandom-caption">
          {selected ? (
            <>
              <Check size={12} />
              {t.following}
            </>
          ) : (
            t.artwork
          )}
        </span>
      </div>
    </article>
  );
}
