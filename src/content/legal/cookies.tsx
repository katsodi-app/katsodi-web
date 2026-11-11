import Link from "next/link";
import { CookiePreferences } from "@/components/consent-banner";
import type { LegalDoc } from "./types";

const storage: [string, string, string, string][] = [
  [
    "sb-…-auth-token (may be split into .0, .1)",
    "Cookie, necessary",
    "Keeps you signed in. Set only when you sign in; not readable by page scripts.",
    "Until you sign out, at most 400 days",
  ],
  [
    "sb-…-auth-token-code-verifier",
    "Cookie, necessary",
    "Completes email confirmation and password recovery securely.",
    "Until the link is used",
  ],
  [
    "katsodi.consent",
    "Local storage, necessary",
    "Remembers your choice about embedded media.",
    "Until you change it or clear site data",
  ],
  [
    "katsodi.theme, katsodi.locale, katsodi.sidebar",
    "Local storage, necessary",
    "Your theme, language and sidebar layout.",
    "Until you clear site data",
  ],
  [
    "katsodi.workspace.v1",
    "Local storage, necessary",
    "Local rooms, saved rooms and fandoms you follow on this device.",
    "Until you clear site data",
  ],
  [
    "katsodi.currentRoom",
    "Local storage, necessary",
    "The room shown in the “you are in a room” bar.",
    "Until you leave or hide the bar",
  ],
  [
    "katsodi.pendingInvite",
    "Session storage, necessary",
    "Keeps an invite link while you sign in.",
    "Until the tab is closed",
  ],
];

export const cookies: LegalDoc = {
  slug: "cookies",
  title: "Cookie Policy",
  summary:
    "Which cookies and browser storage Katsodi uses, why, for how long, and how to control embedded third-party media.",
  version: "0.2",
  updated: "2026-11-11",
  sections: [
    {
      id: "what",
      title: "1. What cookies and similar technologies are",
      body: (
        <p>
          Cookies are small files a website stores in your browser and receives
          back with each request. Local storage and session storage are similar
          browser features that keep data on your device without sending it to
          the server automatically. Both can be &ldquo;first-party&rdquo; (set
          by Katsodi) or &ldquo;third-party&rdquo; (set by another service whose
          content appears on the page).
        </p>
      ),
    },
    {
      id: "ours",
      title: "2. What Katsodi uses",
      body: (
        <>
          <p>
            Katsodi uses only strictly necessary cookies and storage. There are
            no analytics, advertising or tracking cookies.
          </p>
          <div
            className="legal-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Cookies and browser storage table"
          >
            <table className="legal-table">
              <caption className="sr-only">Cookies and storage</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Purpose</th>
                  <th scope="col">Duration</th>
                </tr>
              </thead>
              <tbody>
                {storage.map(([name, type, purpose, duration]) => (
                  <tr key={name}>
                    <td>
                      <code>{name}</code>
                    </td>
                    <td>{type}</td>
                    <td>{purpose}</td>
                    <td>{duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Necessary storage does not need consent because the site cannot
            provide what you asked for without it, but you can still delete it
            in your browser at any time (you will be signed out and local rooms
            will be lost).
          </p>
        </>
      ),
    },
    {
      id: "third-party",
      title: "3. Third-party cookies from embedded media",
      body: (
        <>
          <p>
            Rooms, fandom and music pages can show players and websites from
            other services: YouTube, VK Video, Rutube, Twitch, SoundCloud,
            Vimeo, Dailymotion, Spotify and any website a room owner shares.
            When they load, those services receive your IP address and may set
            their own cookies or similar identifiers, for example to remember
            your sign-in with them, measure playback or show ads. Their policies
            decide what they set and for how long; we cannot see or control it.
          </p>
          <p>
            That is why Katsodi loads them only after you agree: on the banner
            shown on your first visit, in the preferences below, or with
            &ldquo;Load once&rdquo; on a single player. Until then you see a
            placeholder naming the service. Links that open another site in a
            new tab are not affected. Remote artwork may still contact its
            source when displayed; the embedded-media preference does not gate
            every image request and does not guarantee that no external
            connection takes place.
          </p>
          <p>
            The optional shared browser runs on Hyperbeam and, like the players
            above, appears only after you agree. Voice chat and link demos
            connect to LiveKit only when you join or start them; they are
            described in the <Link href="/privacy#voice">Privacy Policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: "preferences",
      title: "4. Your preferences",
      body: (
        <>
          <p>
            Your choice is stored on this device and applies until you change it
            here. Withdrawing consent stops new players from loading; to remove
            cookies the services have already set, delete them in your browser
            or on those services.
          </p>
          <CookiePreferences />
        </>
      ),
    },
    {
      id: "browser",
      title: "5. Managing cookies in your browser",
      body: (
        <p>
          All browsers let you view and delete cookies and site data, and block
          third-party cookies, in their privacy settings. Blocking
          Katsodi&rsquo;s own necessary cookies prevents signing in.
        </p>
      ),
    },
    {
      id: "changes",
      title: "6. Changes",
      body: (
        <p>
          If Katsodi starts using a new kind of cookie or storage, this page is
          updated first; if it is not strictly necessary, we will ask for your
          consent again before using it.
        </p>
      ),
    },
  ],
};
