"use client";
import { useActionState, useEffect, useState } from "react";
import { ExternalLink, Globe, MonitorPlay } from "lucide-react";
import { updateRoomSite } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import type { RoomSite } from "@/lib/server/network-data";
import { siteEmbeddingSchema } from "@/lib/server/site-embed-schema";
import { ActionStatus } from "./account-forms";
import { ExternalMedia, hostLabel } from "./external-media";
import { useWorkspace } from "./workspace-provider";

type Check =
  | { state: "checking" }
  | { state: "allowed"; src: string }
  | { state: "blocked" | "unchecked" };

/**
 * A general website for the room. Each member's browser loads the page in
 * its own sandboxed iframe, only after the server confirmed the site allows
 * embedding; only the link is shared. Sites that refuse are offered in the
 * shared browser (when configured) or a new tab.
 */
export function RoomWebsite({
  roomId,
  site,
  canHost,
  sharedBrowser,
  onOpenInBrowser,
  onChanged,
}: {
  roomId: string;
  site: RoomSite | null;
  canHost: boolean;
  /** True when the Hyperbeam shared browser is available to this room. */
  sharedBrowser: boolean;
  onOpenInBrowser: (url: string) => void;
  onChanged: () => void;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const [check, setCheck] = useState<Check>({ state: "checking" });
  const [saved, save, saving] = useActionState(updateRoomSite, initialResult);
  const [cleared, clear, clearing] = useActionState(
    updateRoomSite,
    initialResult,
  );
  useEffect(() => {
    if (saved.status === "success" || cleared.status === "success") onChanged();
  }, [saved, cleared, onChanged]);
  const url = site?.url ?? "";
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A new link starts a new check.
    setCheck({ state: "checking" });
    fetch(`/api/rooms/${roomId}/site`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const parsed = siteEmbeddingSchema.safeParse(data?.site);
        if (!parsed.success || data.site.url !== url)
          return setCheck({ state: "unchecked" });
        setCheck(
          parsed.data.embedding === "allowed"
            ? { state: "allowed", src: parsed.data.src }
            : { state: parsed.data.embedding },
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setCheck({ state: "unchecked" });
      });
    return () => controller.abort();
  }, [roomId, url]);

  return (
    <section className="room-player room-website" aria-label={n.siteTitle}>
      <header>
        <span>
          <Globe size={17} />
          {n.siteTitle}
        </span>
        {url && (
          <span className="pill" title={url}>
            {new URL(url).hostname}
          </span>
        )}
      </header>
      {!url ? (
        <div className="player-state" role="status">
          <Globe size={38} />
          <h2>{n.siteTitle}</h2>
          <p>{canHost ? n.siteIntro : n.siteWaiting}</p>
        </div>
      ) : check.state === "allowed" ? (
        <ExternalMedia provider={hostLabel(check.src)}>
          <div className="room-player-frame">
            <iframe
              key={check.src}
              src={check.src}
              title={n.siteFrame}
              allow="fullscreen; picture-in-picture; clipboard-write"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            />
          </div>
        </ExternalMedia>
      ) : (
        <div className="player-state" role="status">
          <Globe size={38} />
          <h2>{check.state === "checking" ? n.siteChecking : n.siteNotHere}</h2>
          {check.state !== "checking" && (
            <p>{check.state === "blocked" ? n.siteBlocked : n.siteUnchecked}</p>
          )}
          {check.state !== "checking" && sharedBrowser && canHost && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => onOpenInBrowser(url)}
            >
              <MonitorPlay size={17} />
              {n.siteInBrowser}
            </button>
          )}
        </div>
      )}
      {url && (
        <footer>
          <p>{n.siteNote}</p>
          <div>
            <a
              className="text-link"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {n.siteNewTab}
              <ExternalLink size={15} />
            </a>
            {canHost && (
              <form action={clear}>
                <input type="hidden" name="room" value={roomId} />
                <input type="hidden" name="url" value="" />
                <button className="text-link" disabled={clearing}>
                  {n.siteClose}
                </button>
              </form>
            )}
          </div>
          {cleared.status === "error" && <ActionStatus result={cleared} />}
        </footer>
      )}
      {canHost && (
        <form action={save} className="form-card room-source-form">
          <input type="hidden" name="room" value={roomId} />
          <label htmlFor="room-site-url">{n.siteUrl}</label>
          <div>
            <input
              key={url}
              id="room-site-url"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              required
              defaultValue={url}
              maxLength={2048}
              placeholder="https://…"
              disabled={saving}
            />
            <button className="button button-primary" disabled={saving}>
              {saving ? t.network.pending : n.siteOpen}
            </button>
          </div>
          <ActionStatus result={saved} />
        </form>
      )}
    </section>
  );
}
