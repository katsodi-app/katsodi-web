"use client";
import { matchesSearch } from "@/lib/search";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { categories, fandoms, type Category } from "@/lib/fandoms";
import type { CommunityFandom } from "@/lib/community-fandoms";
import { useWorkspace } from "./workspace-provider";
import { FandomCard } from "./fandom-card";
import { featuredFandoms } from "@/data/editorial";
import { PageIntro } from "./page-design";
import { Empty } from "./state-screens";

export function FandomScreen({
  initialQuery = "",
  initialCategory = "all",
  community = [],
}: {
  initialQuery?: string;
  initialCategory?: string;
  /** Fandoms approved from members' requests (Task 8). */
  community?: CommunityFandom[];
}) {
  const { t, state } = useWorkspace();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category | "all">(
    categories.includes(initialCategory as Category)
      ? (initialCategory as Category)
      : "all",
  );
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [count, setCount] = useState(24);
  const ordered: {
    id: string;
    name: string;
    category: Category;
    description?: string | null;
  }[] = [
    ...featuredFandoms,
    ...fandoms.filter(
      (f) => !featuredFandoms.some((featured) => featured.id === f.id),
    ),
    ...community,
  ];
  const filtered = ordered.filter(
    (f) =>
      (category === "all" || category === f.category) &&
      matchesSearch(query, f.name, f.description, t[f.category]) &&
      (!selectedOnly || state.followed.includes(f.id)),
  );
  return (
    <>
      <PageIntro
        eyebrow={t.design.fandomEyebrow}
        title={t.yourWorld}
        description={t.fandomIntro}
        motif="fandom"
      >
        <span className="brand-status">
          {t.selected}: {state.followed.length}
        </span>
      </PageIntro>
      <div className="catalog-intro">
        <span>
          {t.noMetrics} · {fandoms.length + community.length}
        </span>
        <Link href="/fandoms/request" className="text-link">
          {t.fandomRequest.cta}
          <ArrowUpRight size={15} />
        </Link>
        <span>{t.imageNote}</span>
      </div>
      <div className="filter-bar fandom-filters">
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">{t.fandomSearch}</span>
          <input
            placeholder={t.fandomSearch}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCount(24);
            }}
          />
        </label>
        <label>
          <span className="sr-only">{t.allFandoms}</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category | "all");
              setCount(24);
            }}
          >
            <option value="all">{t.allFandoms}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t[c]}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`chip ${selectedOnly ? "active" : ""}`}
          aria-pressed={selectedOnly}
          onClick={() => {
            setSelectedOnly(!selectedOnly);
            setCount(24);
          }}
        >
          {t.allSelected}
        </button>
      </div>
      <div className="fandom-grid">
        {filtered.slice(0, count).map((f, index) => (
          <FandomCard
            key={f.id}
            fandom={f}
            featured={index === 0 || index === 7}
          />
        ))}
      </div>
      {!filtered.length && <Empty title={t.emptyFandom} />}
      <div className="catalog-bottom">
        <span>
          {Math.min(count, filtered.length)} / {filtered.length}
        </span>
        {filtered.length > count && (
          <button
            className="button button-secondary"
            onClick={() => setCount((n) => n + 24)}
          >
            {t.showMore}
          </button>
        )}
        <Link className="text-link" href="/credits">
          {t.photoCredits}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}
