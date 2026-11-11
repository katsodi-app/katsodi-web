"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Globe, RotateCw, X } from "lucide-react";
import {
  claimSharedBrowserControl,
  endSharedBrowser,
  reportSharedBrowserUrl,
  startSharedBrowser,
} from "@/lib/server/browser-actions";
import { initialResult } from "@/lib/server/contracts";
import type { SharedBrowser as SharedBrowserState } from "@/lib/server/network-data";
import { inspectSource } from "@/lib/providers";
import { ActionStatus } from "./account-forms";
import { ExternalMedia } from "./external-media";
import { useWorkspace } from "./workspace-provider";

/** The parts of the Hyperbeam client this component uses. */
type HyperbeamClient = {
  userId: string;
  destroy(): void;
  tabs: {
    update(props: { url: string }): Promise<unknown>;
    reload(): Promise<unknown> | void;
    goBack(): Promise<unknown> | void;
    goForward(): Promise<unknown> | void;
    onUpdated: {
      addListener(
        listener: (
          tabId: number,
          change: { url?: string },
          tab?: { url?: string },
        ) => void,
      ): void;
    };
  };
};

/**
 * A Hyperbeam cloud browser shared by the room. Hosts (owner/moderators)
 * control it; their connection is granted control by the server. Members
 * watch, with the host's current address shown read-only.
 */
export function SharedBrowser({
  roomId,
  browser,
  canHost,
  onChanged,
  initialUrl = "",
}: {
  roomId: string;
  browser: SharedBrowserState | null;
  canHost: boolean;
  onChanged: () => void;
  /** Prefills the start form, e.g. from a website that refused embedding. */
  initialUrl?: string;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  // A state ref: the frame appears only after consent to embedded media,
  // and the client must attach whenever it does.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const client = useRef<HyperbeamClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);
  const [address, setAddress] = useState("");
  const [started, start, starting] = useActionState(
    startSharedBrowser,
    initialResult,
  );
  const [ended, end, ending] = useActionState(endSharedBrowser, initialResult);
  useEffect(() => {
    if (started.status === "success" || ended.status === "success") onChanged();
  }, [started, ended, onChanged]);

  const embed = browser?.embed_url;
  useEffect(() => {
    if (!embed || !frame) return;
    let alive = true;
    let lastReport = 0;
    (async () => {
      try {
        const { default: Hyperbeam } = await import("@hyperbeam/web");
        if (!alive) return;
        const hb = (await Hyperbeam(frame, embed, {
          delegateKeyboard: canHost,
        })) as unknown as HyperbeamClient;
        if (!alive) return hb.destroy();
        client.current = hb;
        setConnected(true);
        if (!canHost) return;
        // The server checks the host role, then grants control to this
        // connection only.
        const claim = new FormData();
        claim.set("room", roomId);
        claim.set("connection", hb.userId);
        const granted = await claimSharedBrowserControl(initialResult, claim);
        if (granted.status !== "success") setFailed(true);
        hb.tabs.onUpdated.addListener((_id, change, tab) => {
          const url = change.url || tab?.url;
          if (!url || !/^https?:\/\//.test(url)) return;
          setAddress(url);
          if (Date.now() - lastReport < 1200) return;
          lastReport = Date.now();
          const report = new FormData();
          report.set("room", roomId);
          report.set("url", url.slice(0, 2048));
          void reportSharedBrowserUrl(initialResult, report);
        });
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      setConnected(false);
      client.current?.destroy();
      client.current = null;
    };
  }, [embed, canHost, roomId, frame]);

  if (!browser)
    return (
      <section className="shared-browser shared-browser-empty">
        <Globe size={34} strokeWidth={1.4} />
        <h2>{n.browserTitle}</h2>
        <p>{canHost ? n.browserIntro : n.browserWaiting}</p>
        {canHost && (
          <form action={start} className="browser-start">
            <input type="hidden" name="room" value={roomId} />
            <label className="sr-only" htmlFor="browser-start-url">
              {n.browserUrl}
            </label>
            <input
              key={initialUrl}
              defaultValue={initialUrl}
              id="browser-start-url"
              name="url"
              type="url"
              inputMode="url"
              required
              maxLength={2048}
              placeholder="https://"
            />
            <button className="button button-primary" disabled={starting}>
              {starting ? n.browserStarting : n.browserStart}
            </button>
          </form>
        )}
        {started.status === "error" && <ActionStatus result={started} />}
        <small>{n.browserDrm}</small>
      </section>
    );

  const go = (raw: string) => {
    const target = inspectSource(raw.trim());
    if (target) void client.current?.tabs.update({ url: target.url });
  };
  const shownUrl = (canHost && address) || browser.current_url || "";
  return (
    <section className="shared-browser" aria-label={n.browserTitle}>
      <div className="browser-bar">
        {canHost ? (
          <>
            <button
              type="button"
              className="browser-icon"
              aria-label={n.browserBack}
              title={n.browserBack}
              disabled={!connected}
              onClick={() => void client.current?.tabs.goBack()}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="browser-icon"
              aria-label={n.browserForward}
              title={n.browserForward}
              disabled={!connected}
              onClick={() => void client.current?.tabs.goForward()}
            >
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="browser-icon"
              aria-label={n.browserReload}
              title={n.browserReload}
              disabled={!connected}
              onClick={() => void client.current?.tabs.reload()}
            >
              <RotateCw size={16} />
            </button>
            <form
              className="browser-address"
              onSubmit={(event) => {
                event.preventDefault();
                go(
                  String(
                    new FormData(event.currentTarget).get("address") || "",
                  ),
                );
              }}
            >
              <label className="sr-only" htmlFor="browser-address">
                {n.browserUrl}
              </label>
              <input
                id="browser-address"
                name="address"
                key={shownUrl}
                defaultValue={shownUrl}
                inputMode="url"
                maxLength={2048}
                disabled={!connected}
              />
            </form>
            <form action={end}>
              <input type="hidden" name="room" value={roomId} />
              <button
                className="browser-icon"
                aria-label={n.browserEnd}
                title={n.browserEnd}
                disabled={ending}
              >
                <X size={16} />
              </button>
            </form>
          </>
        ) : (
          <p className="browser-address-readonly" aria-label={n.browserUrl}>
            <Globe size={14} />
            <span>{shownUrl || n.browserTitle}</span>
          </p>
        )}
      </div>
      <ExternalMedia provider="Hyperbeam">
        <div className="browser-frame" ref={setFrame} />
      </ExternalMedia>
      <p className="sync-status" role="status">
        {canHost ? n.browserHost : n.browserViewOnly}
      </p>
      {failed && (
        <p className="sync-error" role="alert">
          {n.browserFailed}
        </p>
      )}
      {ended.status === "error" && <ActionStatus result={ended} />}
    </section>
  );
}
