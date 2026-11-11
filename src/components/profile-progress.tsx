"use client";
import {
  Clapperboard,
  Crown,
  DoorOpen,
  Footprints,
  Lock,
  Music,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AchievementId, Progress } from "@/lib/progression";
import { useWorkspace } from "./workspace-provider";

const icons: Record<AchievementId, LucideIcon> = {
  first_steps: Footprints,
  room_creator: DoorOpen,
  social_butterfly: Users,
  movie_marathon: Clapperboard,
  music_enthusiast: Music,
  community_veteran: ShieldCheck,
  legendary_member: Crown,
};

/** Level bar and achievements; locked ones appear only on your own profile. */
export function ProfileProgress({ progress }: { progress: Progress }) {
  const { t, locale } = useWorkspace();
  const g = t.progress;
  const percent = Math.min(
    100,
    Math.round((progress.into_level / progress.next_level) * 100),
  );
  return (
    <section className="brand-surface profile-progress" aria-label={g.title}>
      <div className="level-row">
        <span className="level-badge">
          <small>{g.level}</small>
          <strong>{progress.level}</strong>
        </span>
        <div className="level-track">
          <div
            className="level-bar"
            role="progressbar"
            aria-label={`${g.level} ${progress.level}`}
            aria-valuemin={0}
            aria-valuemax={progress.next_level}
            aria-valuenow={progress.into_level}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <p>
            {progress.into_level} / {progress.next_level} {g.xp} · {g.toNext}{" "}
            {progress.level + 1}
          </p>
          <p className="level-total">
            {g.total}: {progress.xp} {g.xp}
          </p>
        </div>
      </div>
      <h2 className="section-index">{g.achievements}</h2>
      {progress.achievements.length ? (
        <ul className="achievement-grid">
          {progress.achievements.map((item) => {
            const Icon = icons[item.id];
            const unlocked = !!item.unlocked_at;
            return (
              <li
                key={item.id}
                className={`achievement achievement-${item.rarity} ${unlocked ? "" : "is-locked"}`}
              >
                <span className="achievement-icon" aria-hidden="true">
                  {unlocked ? <Icon size={20} /> : <Lock size={18} />}
                </span>
                <span className="achievement-text">
                  <strong>{g[`name_${item.id}`]}</strong>
                  <span>{g[`desc_${item.id}`]}</span>
                  <small>
                    {g[`rarity_${item.rarity}`]} · +{item.xp} {g.xp}
                    {" · "}
                    {unlocked
                      ? `${g.unlocked} ${new Date(item.unlocked_at!).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}`
                      : g.locked}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{g.none}</p>
      )}
      <p className="progress-how">{g.how}</p>
    </section>
  );
}
