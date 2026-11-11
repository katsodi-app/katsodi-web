"use client";
import { ProfileProgress } from "./profile-progress";
import type { Progress } from "@/lib/progression";
import { ProfileHeader, type ProfileMediaState } from "./profile-media-editor";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Heart,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  FileCheck2,
  History,
} from "lucide-react";
import { fandoms, type Category } from "@/lib/fandoms";
import { fandomAsset } from "@/data/editorial";
import type { CommunityFandom } from "@/lib/community-fandoms";
import { useWorkspace } from "./workspace-provider";
import { PageIntro, StatePanel } from "./page-design";
import { FandomCard } from "./fandom-card";
import { EditorialImage } from "./editorial-image";
import {
  FandomConnections,
  type FandomRoomsResult,
} from "./fandom-connections";
import { BackendNotice } from "./account-forms";

export function FriendsPage() {
  const { t } = useWorkspace();
  const d = t.design;
  const [tab, setTab] = useState<"connections" | "requests" | "blocked">(
    "connections",
  );
  return (
    <>
      <PageIntro
        eyebrow={d.personalEyebrow}
        title={d.friends}
        description={d.friendsHint}
        motif="people"
      >
        <Link href="/network" className="button button-primary">
          {t.network.catalog}
          <ArrowUpRight size={16} />
        </Link>
      </PageIntro>
      <div className="brand-duo">
        <section className="brand-surface">
          <div
            className="brand-tab-buttons"
            role="group"
            aria-label={d.connections}
          >
            {(["connections", "requests", "blocked"] as const).map((key) => (
              <button
                key={key}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {d[key]}
              </button>
            ))}
          </div>
          <StatePanel
            motif="people"
            title={tab === "connections" ? d.friendsEmpty : d[tab]}
            description={d.friendsEmptyHint}
          />
        </section>
        <aside className="brand-surface">
          <span className="brand-status">
            <Clock3 size={13} />
            {d.planned}
          </span>
          <h2 style={{ marginTop: 24 }}>{d.friends}</h2>
          <label className="search-box planned-search">
            <Search size={17} />
            <span className="sr-only">{d.findPeople}</span>
            <input
              disabled
              placeholder={d.findPeople}
              aria-describedby="friends-service-hint"
            />
          </label>
          <p id="friends-service-hint">{d.friendsPlanned}</p>
          <div className="brand-feature-list">
            <div>
              <Users size={19} />
              <span>
                <h3>{t.network.newRoom}</h3>
                <p>{t.network.inviteHint}</p>
              </span>
            </div>
            <div>
              <Heart size={19} />
              <span>
                <h3>{t.fandoms}</h3>
                <p>{t.fandomIntro}</p>
              </span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
export function ModerationPage() {
  const { t } = useWorkspace();
  const d = t.design;
  return (
    <>
      <PageIntro
        eyebrow={d.personalEyebrow}
        title={d.moderation}
        description={d.moderationHint}
        motif="shield"
      />
      <div className="brand-duo">
        <StatePanel
          title={d.moderationLocked}
          description={d.moderationLockedHint}
          motif="shield"
        >
          <span className="brand-status">
            <ShieldCheck size={14} />
            {d.planned}
          </span>
          <Link href="/home" className="button button-secondary">
            {t.returnHome}
          </Link>
        </StatePanel>
        <aside className="brand-surface">
          <p className="section-index">{d.moderation}</p>
          <div className="brand-feature-list">
            {[
              { title: d.reports, body: d.reportsHint, Icon: ShieldCheck },
              {
                title: d.submissions,
                body: d.submissionsHint,
                Icon: FileCheck2,
              },
              { title: d.audit, body: d.auditHint, Icon: History },
            ].map(({ title, body, Icon }) => (
              <div key={title}>
                <Icon size={19} />
                <span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
export function FandomDetail({
  id,
  roomsResult,
  community = null,
}: {
  id: string;
  roomsResult?: FandomRoomsResult;
  /** A fandom approved from a member's request (Task 8). */
  community?: CommunityFandom | null;
}) {
  const { t, state, ready, toggleFandom } = useWorkspace();
  const f = community ?? fandoms.find((item) => item.id === id)!;
  const selected = state.followed.includes(id);
  return (
    <>
      <Link href="/fandoms" className="text-link room-back-link">
        <ArrowLeft size={16} />
        {t.design.backFandoms}
      </Link>
      <header className="fandom-detail-hero">
        <div className="fandom-detail-poster">
          <EditorialImage
            asset={fandomAsset(f)}
            sizes="(max-width: 760px) 150px, 240px"
            priority
          />
        </div>
        <div>
          <p className="eyebrow">
            {t[f.category]} /{" "}
            {community ? t.fandomRequest.communityBadge : "KATSODI"}
          </p>
          <h1>
            {f.name}
            <span className="brand-period">.</span>
          </h1>
          <p>{t.design.fandomDetailHint}</p>
          <button
            disabled={!ready}
            className={`button ${selected ? "button-secondary" : "button-primary"}`}
            aria-pressed={selected}
            onClick={() => toggleFandom(id)}
          >
            {selected ? <Check size={17} /> : <Heart size={17} />}{" "}
            {selected ? t.following : t.follow}
          </button>
          <small>{t.design.localSelection}</small>
        </div>
      </header>
      <FandomConnections
        id={id}
        result={roomsResult}
        summary={community?.description ?? undefined}
      />
      <div className="section-heading" style={{ marginTop: 36 }}>
        <h2>{t.design.discoverFandoms}</h2>
      </div>
      <div className="fandom-grid">
        {fandoms
          .filter((item) => item.category === f.category && item.id !== id)
          .slice(0, 4)
          .map((item) => (
            <FandomCard key={item.id} fandom={item} />
          ))}
      </div>
    </>
  );
}
export type PublicProfile = {
  username: string;
  display_name: string;
  bio: string;
  created_at?: string;
  /** Null until the profile-media migration is applied. */
  media?: ProfileMediaState | null;
  fandoms?: string[];
  /** Names of community fandoms among them (not in the static catalogue). */
  communityFandoms?: { id: string; name: string; category: Category }[];
  /** Null until the progression migration is applied. */
  progress?: Progress | null;
};
export function ProfilePage({ profile }: { profile: PublicProfile | null }) {
  const { t, locale } = useWorkspace();
  const d = t.design;
  if (!profile)
    return (
      <>
        <PageIntro
          eyebrow={d.personalEyebrow}
          title={d.publicProfile}
          description={d.profileHint}
          motif="people"
        />
        <StatePanel
          title={d.profileUnavailable}
          description={d.profileUnavailableHint}
          motif="people"
        >
          <Link href="/account" className="button button-primary">
            {t.network.account}
          </Link>
        </StatePanel>
      </>
    );
  const pm = t.profileMedia;
  const joined = profile.created_at
    ? // A full date keeps Russian month names in the right case ("1 ноября").
      new Date(profile.created_at).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const favourites = (profile.fandoms || [])
    .map(
      (id) =>
        fandoms.find((item) => item.id === id) ??
        profile.communityFandoms?.find((item) => item.id === id),
    )
    .filter(
      (item): item is { id: string; name: string; category: Category } =>
        !!item,
    );
  return (
    <article className="profile-page">
      <ProfileHeader
        media={
          profile.media || {
            userId: "",
            avatar: false,
            banner: false,
            version: null,
          }
        }
        name={profile.display_name}
      >
        <div className="profile-identity">
          <h1>{profile.display_name}</h1>
          <p>
            @{profile.username}
            {joined && (
              <>
                {" · "}
                {pm.memberSince} {joined}
              </>
            )}
          </p>
        </div>
      </ProfileHeader>
      <div className="profile-sections">
        <section className="brand-surface">
          <p className="section-index">{d.about}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{profile.bio || d.noBio}</p>
        </section>
      </div>
      {/* Task 6: the user's fandoms as poster cards, each opening its page. */}
      <section
        className="brand-surface profile-fandom-section"
        aria-labelledby="profile-fandoms-title"
      >
        <h2 className="section-index" id="profile-fandoms-title">
          {pm.fandoms}
          {favourites.length > 0 && (
            <span className="profile-fandom-count">{favourites.length}</span>
          )}
        </h2>
        {favourites.length ? (
          <ul className="profile-fandom-cards">
            {favourites.map((item) => (
              <li key={item.id}>
                <Link href={`/fandoms/${item.id}`}>
                  <EditorialImage
                    asset={fandomAsset(item)}
                    sizes="(max-width: 600px) 30vw, 140px"
                    className="profile-fandom-poster"
                  />
                  <strong>{item.name}</strong>
                  <span>{t[item.category]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>{pm.noFandoms}</p>
        )}
      </section>
      {profile.progress && <ProfileProgress progress={profile.progress} />}
      <div className="page-intro-actions">
        <Link href="/network" className="button button-primary">
          {t.network.catalog}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
export function OnboardingWelcome({
  configured,
  error = false,
}: {
  configured: boolean;
  error?: boolean;
}) {
  const { t } = useWorkspace();
  const d = t.design;
  return (
    <>
      <PageIntro
        eyebrow={d.personalEyebrow}
        title={d.onboarding}
        description={d.onboardingHint}
        motif="people"
      />
      <div className="brand-duo">
        <StatePanel
          title={d.profileTitle}
          description={error ? t.network.backendError : d.accountGateHint}
          motif="people"
        >
          {configured ? (
            <Link
              href="/login?next=/onboarding"
              className="button button-primary"
            >
              {t.network.login}
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <BackendNotice />
          )}
          <Link href="/home" className="text-link">
            {t.network.backExplore}
          </Link>
        </StatePanel>
        <aside className="brand-surface">
          <div className="brand-feature-list">
            {[
              {
                title: d.identity,
                body: t.network.profileIntro,
                Icon: UserRound,
              },
              { title: d.interests, body: t.fandomIntro, Icon: Sparkles },
              { title: d.finish, body: t.network.serverIntro, Icon: Users },
            ].map(({ title, body, Icon }) => (
              <div key={title}>
                <Icon size={20} />
                <span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
