import Link from "next/link";
import { OwnerFact } from "./owner-fact";
import type { LegalDoc } from "./types";

export const about: LegalDoc = {
  slug: "about",
  title: "About Katsodi",
  summary:
    "Katsodi is a place to watch, listen and talk together with people who love the same stories.",
  version: "0.1",
  updated: "2026-11-10",
  informational: true,
  sections: [
    {
      id: "what",
      title: "What Katsodi is",
      body: (
        <p>
          Katsodi is a website for shared rooms. You pick a film, series, video
          or song from a service you already use, invite friends or open the
          room to your fandom, and watch or listen together while you talk. The
          media can be played by an external service or shared live with the
          room where authorised; company and conversation are what Katsodi adds.
        </p>
      ),
    },
    {
      id: "purpose",
      title: "Why it exists",
      body: (
        <p>
          Fandoms are more fun together. Katsodi tries to make
          &ldquo;let&rsquo;s watch this now&rdquo; take a link instead of a
          schedule, and to make it easy to find people who care about the same
          worlds.
        </p>
      ),
    },
    {
      id: "features",
      title: "What you can do",
      body: (
        <ul>
          <li>
            <strong>Rooms:</strong> local rooms on your device, and shared
            public or private rooms with invites, owners and moderators.
          </li>
          <li>
            <strong>Watch and listen in sync:</strong> YouTube, Vimeo,
            SoundCloud and other players stay in sync for the room, with a
            shared queue; a website tab shows a page to everyone.
          </li>
          <li>
            <strong>Talk:</strong> text chat with stickers and images, and voice
            chat on desktop browsers.
          </li>
          <li>
            <strong>Link demos:</strong> show a site live to the room while
            hosts can draw, point and pause.
          </li>
          <li>
            <strong>Fandoms:</strong> a catalogue of 150 fandoms with verified
            official links where we found them, rooms for each one, and{" "}
            <Link href="/fandoms/request">requests for new ones</Link>.
          </li>
          <li>
            <strong>Music:</strong> the <Link href="/music">Top 150</Link>{" "}
            most-streamed songs, playable on their own pages.
          </li>
          <li>
            <strong>People:</strong> profiles, friends, levels and achievements.
          </li>
        </ul>
      ),
    },
    {
      id: "status",
      title: "Where it stands",
      body: (
        <p>
          Katsodi is in active development, and some parts are not finished:
          voice and demos do not work on phones yet, and reporting tools are
          still planned. Katsodi is an unregistered project operated from{" "}
          <OwnerFact field="operatingCountry" />, not a registered company.
          Questions and ideas are welcome on the{" "}
          <Link href="/contact">Contact page</Link>.
        </p>
      ),
    },
  ],
};
