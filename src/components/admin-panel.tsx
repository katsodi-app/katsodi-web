"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, Music, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { decideFandomRequest } from "@/lib/server/fandom-actions";
import { initialResult } from "@/lib/server/contracts";
import { fandoms } from "@/lib/fandoms";
import { musicTracks, spotifyUrl } from "@/lib/music";
import type { AdminState } from "@/lib/server/community-fandoms";
import type { FandomRequest } from "@/lib/community-fandoms";
import { ActionStatus } from "./account-forms";
import { RequestStatus } from "./fandom-request";
import { PageIntro } from "./page-design";
import { useWorkspace } from "./workspace-provider";

function Decide({ request }: { request: FandomRequest }) {
  const { t } = useWorkspace();
  const a = t.admin;
  const [result, submit, pending] = useActionState(
    decideFandomRequest,
    initialResult,
  );
  return (
    <form action={submit} className="admin-decide">
      <input type="hidden" name="request" value={request.id} />
      <label className="sr-only" htmlFor={`reason-${request.id}`}>
        {a.reason}
      </label>
      <input
        id={`reason-${request.id}`}
        name="reason"
        maxLength={300}
        placeholder={a.reasonPlaceholder}
        disabled={pending}
      />
      <button
        className="button button-primary button-small"
        name="approve"
        value="1"
        disabled={pending}
      >
        <Check size={15} />
        {a.approve}
      </button>
      <button
        className="button button-secondary button-small"
        name="approve"
        value="0"
        disabled={pending}
      >
        <X size={15} />
        {a.reject}
      </button>
      <ActionStatus
        result={result.status === "error" ? result : initialResult}
      />
    </form>
  );
}

/**
 * Task 9: the administrator's panel. The server renders it only for the
 * administrator; every action is checked again in the database.
 */
export function AdminPanel({ state }: { state: AdminState }) {
  const { t, locale } = useWorkspace();
  const a = t.admin;
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const pending = state.requests.filter((r) => r.status === "pending");
  const requests = filter === "pending" ? pending : state.requests;
  const allFandoms = [
    ...fandoms.map((f) => ({ ...f, community: false })),
    ...state.community.map((f) => ({ ...f, community: true })),
  ];
  return (
    <>
      <PageIntro
        eyebrow={a.eyebrow}
        title={a.title}
        description={a.intro}
        motif="shield"
      />
      <Tabs.Root
        className="admin-panel"
        defaultValue={pending.length ? "requests" : "accounts"}
      >
        <Tabs.List className="admin-tabs" aria-label={a.sections}>
          <Tabs.Trigger value="accounts">
            <Users size={16} />
            {a.accounts}
            <span className="admin-count">{state.accounts.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="fandoms">
            <Sparkles size={16} />
            {a.fandoms}
            <span className="admin-count">{allFandoms.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="requests">
            <ShieldCheck size={16} />
            {a.requests}
            {pending.length > 0 && (
              <span className="admin-count admin-count-alert">
                {pending.length}
              </span>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="music">
            <Music size={16} />
            {a.music}
            <span className="admin-count">{musicTracks.length}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="accounts" className="brand-surface admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">{a.accounts}</caption>
              <thead>
                <tr>
                  <th scope="col">{a.name}</th>
                  <th scope="col">{a.email}</th>
                  <th scope="col">{a.confirmed}</th>
                  <th scope="col">{a.joined}</th>
                </tr>
              </thead>
              <tbody>
                {state.accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.display_name || "—"}</strong>
                      {account.username && (
                        <Link href={`/profile/${account.username}`}>
                          @{account.username}
                        </Link>
                      )}
                      {account.is_admin && (
                        <span className="admin-badge">{a.adminBadge}</span>
                      )}
                    </td>
                    <td>{account.email || "—"}</td>
                    <td>{account.confirmed ? a.yes : a.no}</td>
                    <td>{date(account.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="form-hint">{a.privacy}</p>
        </Tabs.Content>

        <Tabs.Content value="fandoms" className="brand-surface admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">{a.fandoms}</caption>
              <thead>
                <tr>
                  <th scope="col">{a.fandom}</th>
                  <th scope="col">{a.category}</th>
                  <th scope="col">{a.source}</th>
                  <th scope="col">{a.followers}</th>
                </tr>
              </thead>
              <tbody>
                {allFandoms.map((fandom) => (
                  <tr key={fandom.id}>
                    <td>
                      <Link href={`/fandoms/${fandom.id}`}>{fandom.name}</Link>
                    </td>
                    <td>{t[fandom.category]}</td>
                    <td>{fandom.community ? a.community : a.catalogue}</td>
                    <td>{state.followers[fandom.id] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        <Tabs.Content value="requests" className="brand-surface admin-section">
          <div className="admin-filter" role="group" aria-label={a.requests}>
            <button
              type="button"
              aria-pressed={filter === "pending"}
              onClick={() => setFilter("pending")}
            >
              {a.pending} ({pending.length})
            </button>
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              {a.all} ({state.requests.length})
            </button>
          </div>
          {requests.length ? (
            <ul className="request-list admin-requests">
              {requests.map((request) => (
                <li key={request.id}>
                  <div>
                    <strong>{request.name}</strong>
                    <span>
                      {t[request.category]} · {date(request.created_at)}
                    </span>
                    {request.note && <p>{request.note}</p>}
                    {request.reason && (
                      <p className="request-reason">
                        {t.fandomRequest.reason}: {request.reason}
                      </p>
                    )}
                  </div>
                  <RequestStatus request={request} />
                  {request.status === "pending" ? (
                    <Decide request={request} />
                  ) : (
                    request.fandom_id && (
                      <Link
                        href={`/fandoms/${request.fandom_id}`}
                        className="text-link"
                      >
                        {t.fandomRequest.open}
                      </Link>
                    )
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>{filter === "pending" ? a.noPending : a.noRequests}</p>
          )}
        </Tabs.Content>

        <Tabs.Content value="music" className="brand-surface admin-section">
          <p className="form-hint">{a.musicIntro}</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="sr-only">{a.music}</caption>
              <thead>
                <tr>
                  <th scope="col">{a.rank}</th>
                  <th scope="col">{a.track}</th>
                  <th scope="col">Spotify</th>
                  <th scope="col">{a.soundcloud}</th>
                  <th scope="col">{t.musicChart.checked}</th>
                </tr>
              </thead>
              <tbody>
                {musicTracks.map((track) => (
                  <tr key={track.slug} className="admin-music-row">
                    <td>{track.rank}</td>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element -- Pre-sized Spotify cover. */}
                      <img
                        src={track.thumb}
                        alt=""
                        width={36}
                        height={36}
                        loading="lazy"
                      />{" "}
                      <Link href={`/music/${track.slug}`} className="text-link">
                        {track.title}
                      </Link>{" "}
                      · {track.artists.join(", ")}
                    </td>
                    <td>
                      <a
                        href={spotifyUrl(track.spotifyId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                      >
                        {track.spotifyId}
                      </a>
                    </td>
                    <td>
                      {track.soundcloud ? (
                        <a
                          href={track.soundcloud.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link"
                        >
                          {a.soundcloudVerified}
                        </a>
                      ) : (
                        a.soundcloudSearch
                      )}
                    </td>
                    <td>{track.checked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}
