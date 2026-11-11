"use client";
import type { ReactNode } from "react";
import {
  AudioLines,
  Bookmark,
  Compass,
  Heart,
  Orbit,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
export type PageMotif =
  "orbit" | "rooms" | "saved" | "people" | "fandom" | "settings" | "shield";
const icons: Record<PageMotif, LucideIcon> = {
  orbit: Orbit,
  rooms: AudioLines,
  saved: Bookmark,
  people: Users,
  fandom: Sparkles,
  settings: Compass,
  shield: ShieldCheck,
};
export function BrandArt({ motif = "orbit" }: { motif?: PageMotif }) {
  const Icon = icons[motif];
  return (
    <div className={`brand-art brand-art-${motif}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <span>
        <Icon size={42} strokeWidth={1.15} />
      </span>
      <b>
        <Heart size={15} />
      </b>
      <em>k.</em>
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  motif = "orbit",
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  motif?: PageMotif;
  children?: ReactNode;
}) {
  return (
    <header className={`page-intro page-intro-${motif}`}>
      <div className="page-intro-copy">
        <p className="eyebrow">
          <span />
          {eyebrow}
        </p>
        <h1>
          {title}
          {!/[.!?…]$/u.test(title) && <span className="brand-period">.</span>}
        </h1>
        {description && <p className="page-intro-description">{description}</p>}
        {children && <div className="page-intro-actions">{children}</div>}
      </div>
      <BrandArt motif={motif} />
    </header>
  );
}
export function StatePanel({
  title,
  description,
  motif = "orbit",
  children,
  code,
}: {
  title: string;
  description?: string;
  motif?: PageMotif;
  children?: ReactNode;
  code?: string;
}) {
  const Icon = icons[motif];
  return (
    <section className="brand-state">
      <div className="brand-state-symbol">
        <i />
        <Icon size={34} strokeWidth={1.2} />
        {code && <span>{code}</span>}
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children && <div className="brand-state-actions">{children}</div>}
    </section>
  );
}
