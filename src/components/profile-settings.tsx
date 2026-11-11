"use client";
/* eslint-disable @next/next/no-img-element -- Local pre-sized fandom thumbnails and access-checked profile media. */
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  ImagePlus,
  LogOut,
  Save,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { saveProfile, signOut } from "@/lib/server/auth-actions";
import { initialResult } from "@/lib/server/contracts";
import { categories, fandoms } from "@/lib/fandoms";
import { fandomAsset } from "@/data/editorial";
import { matchesSearch } from "@/lib/search";
import { UserAvatar } from "./user-avatar";
import {
  ProfileMediaEditor,
  type ProfileMediaState,
} from "./profile-media-editor";
import { useWorkspace } from "./workspace-provider";
import { ActionStatus } from "./action-status";
import { PageIntro } from "./page-design";

export type ProfileData = {
  username: string;
  display_name: string;
  bio: string;
  onboarding_completed: boolean;
};

export function ProfileForm({
  profile,
  followed,
  onboarding = false,
  media = null,
  admin = false,
}: {
  profile: ProfileData;
  followed: string[];
  onboarding?: boolean;
  media?: ProfileMediaState | null;
  admin?: boolean;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const s = t.profileSettings;
  const [result, submit, pending] = useActionState(saveProfile, initialResult);
  const [fields, setFields] = useState(profile);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [selected, setSelected] = useState(followed);
  const filtered = fandoms.filter(
    (f) =>
      matchesSearch(query, f.name, t[f.category]) &&
      (category === "all" || category === f.category) &&
      (!selectedOnly || selected.includes(f.id)),
  );
  return (
    <section className="form-page account-page profile-settings-page">
      <PageIntro
        eyebrow={t.design.personalEyebrow}
        title={onboarding ? t.design.onboarding : n.account}
        description={onboarding ? t.design.onboardingHint : s.intro}
        motif="people"
      />
      <div className="profile-layout profile-settings-layout">
        <aside className="profile-passport settings-profile-nav">
          <div className="settings-profile-summary">
            <UserAvatar
              className="profile-monogram"
              userId={media?.userId}
              name={fields.display_name}
              available={media?.avatar ?? false}
              version={media?.version}
            />
            <div>
              <h2>{fields.display_name || t.design.profileTitle}</h2>
              <p>@{fields.username}</p>
            </div>
          </div>
          <nav aria-label={s.navigation}>
            <a href="#profile-identity">
              <UserRound size={17} />
              {s.identityTitle}
            </a>
            <a href="#profile-photos">
              <ImagePlus size={17} />
              {t.profileMedia.title}
            </a>
            <a href="#profile-interests">
              <Sparkles size={17} />
              {s.interestsTitle}
              <span>{selected.length}</span>
            </a>
            <a href="#profile-session">
              <Settings2 size={17} />
              {s.session}
            </a>
          </nav>
          <Link
            href={`/profile/${encodeURIComponent(profile.username)}`}
            className="text-link"
          >
            {t.design.publicProfile}
            <ArrowRight size={14} />
          </Link>
          {admin && (
            <Link href="/admin" className="text-link admin-link">
              {t.admin.title}
              <ArrowRight size={14} />
            </Link>
          )}
        </aside>
        <div className="settings-profile-content">
          <form className="profile-settings-form" action={submit}>
            <section
              id="profile-identity"
              className="profile-form-section settings-profile-card"
            >
              <header>
                <span className="eyebrow">01</span>
                <h2>{s.identityTitle}</h2>
                <p>{s.identityHint}</p>
              </header>
              <div className="profile-identity-fields">
                <label>
                  {n.displayName}
                  <input
                    name="display_name"
                    value={fields.display_name}
                    onChange={(e) =>
                      setFields({ ...fields, display_name: e.target.value })
                    }
                    required
                    minLength={2}
                    maxLength={40}
                    autoComplete="nickname"
                  />
                </label>
                <label>
                  {n.username}
                  <input
                    name="username"
                    value={fields.username}
                    onChange={(e) =>
                      setFields({ ...fields, username: e.target.value })
                    }
                    required
                    pattern="[a-z][a-z0-9_]{2,23}"
                    minLength={3}
                    maxLength={24}
                    autoComplete="username"
                  />
                  <small>{n.usernameHint}</small>
                </label>
                <label className="profile-bio-field">
                  {n.bio}
                  <textarea
                    name="bio"
                    aria-label={n.bio}
                    value={fields.bio}
                    onChange={(e) =>
                      setFields({ ...fields, bio: e.target.value })
                    }
                    maxLength={280}
                    rows={3}
                  />
                  <small>{fields.bio.length}/280</small>
                </label>
              </div>
            </section>
            <section
              id="profile-photos"
              className="profile-form-section settings-profile-card"
            >
              <header>
                <span className="eyebrow">02</span>
                <h2>{t.profileMedia.title}</h2>
                <p>{s.photosHint}</p>
              </header>
              {media ? (
                <ProfileMediaEditor media={media} name={fields.display_name} />
              ) : (
                <p className="notice">{s.photosUnavailable}</p>
              )}
            </section>
            <section
              id="profile-interests"
              className="profile-form-section settings-profile-card"
            >
              <header>
                <span className="eyebrow">03</span>
                <h2>{s.interestsTitle}</h2>
                <p>{s.interestsHint}</p>
              </header>
              <fieldset>
                <legend className="sr-only">{n.interests}</legend>
                {selected.map((id) => (
                  <input key={id} type="hidden" name="fandom" value={id} />
                ))}
                <div className="profile-interest-toolbar">
                  <label>
                    {n.searchInterests}
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label>
                    {s.category}
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">{s.allCategories}</option>
                      {categories.map((id) => (
                        <option key={id} value={id}>
                          {t[id]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button button-secondary"
                    aria-pressed={selectedOnly}
                    onClick={() => setSelectedOnly(!selectedOnly)}
                  >
                    {t.selected} · {selected.length}
                  </button>
                </div>
                <div className="profile-fandoms profile-fandom-tiles">
                  {filtered.map((f) => (
                    <label
                      key={f.id}
                      className={selected.includes(f.id) ? "is-selected" : ""}
                    >
                      <input
                        type="checkbox"
                        aria-label={f.name}
                        checked={selected.includes(f.id)}
                        onChange={() =>
                          setSelected((ids) =>
                            ids.includes(f.id)
                              ? ids.filter((id) => id !== f.id)
                              : [...ids, f.id],
                          )
                        }
                      />
                      <img
                        src={fandomAsset(f).thumbnail || fandomAsset(f).src}
                        alt=""
                        width={42}
                        height={56}
                        loading="lazy"
                        decoding="async"
                      />
                      <span>
                        <strong>{f.name}</strong>
                        <small>{t[f.category]}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {!filtered.length && <p className="form-hint">{s.noFandoms}</p>}
              </fieldset>
            </section>
            <div
              className="profile-save-row profile-settings-save"
              id="profile-finish"
            >
              <span>{s.saveHint}</span>
              <button className="button button-primary" disabled={pending}>
                <Save size={17} />
                {pending ? n.pending : n.save}
              </button>
              <ActionStatus result={result} />
              {onboarding && result.status === "success" && (
                <Link className="button button-secondary" href="/network">
                  {n.catalog}
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </form>
          <section
            id="profile-session"
            className="settings-profile-card profile-session-card"
          >
            <div>
              <h2>{s.session}</h2>
              <p>{s.sessionHint}</p>
            </div>
            <form action={signOut}>
              <button className="button button-secondary">
                <LogOut size={17} />
                {n.logout}
              </button>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}
