import Link from "next/link";
import { OwnerFact } from "./owner-fact";
import type { LegalDoc } from "./types";
import { privacyVersion } from "./versions";

export const privacy: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  summary:
    "How the current version of Katsodi handles accounts, rooms, messages, live media and browser preferences.",
  version: privacyVersion,
  updated: "2026-11-11",
  descriptionOnly: true,
  sections: [
    {
      id: "introduction",
      title: "1. About this policy",
      body: (
        <p>
          This page describes the features currently implemented in Katsodi and
          the data used by them. It covers browsing, accounts, rooms, chat,
          voice, demos and external players. Data questions can be sent to{" "}
          <OwnerFact field="privacyEmail" />.
        </p>
      ),
    },
    {
      id: "categories",
      title: "2. Data used by the service",
      body: (
        <>
          <p>Depending on the features you use, Katsodi processes:</p>
          <ul>
            <li>
              Account email, authentication information, email-confirmation
              status, account creation time and accepted document versions. The
              authentication provider stores password hashes; account passwords
              are not shown to other users.
            </li>
            <li>
              Display name, username, profile text, selected fandoms, avatar and
              banner.
            </li>
            <li>
              Rooms, memberships, roles, invitations, media URLs, playback
              state, queue entries and demo requests.
            </li>
            <li>
              Chat messages, stickers and images, including their sender and
              time.
            </li>
            <li>
              Friend requests, friendships, blocks, progression and fandom
              suggestions.
            </li>
            <li>
              Technical request information such as IP address, browser and
              device information, processed to deliver the service and protect
              access.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "purposes",
      title: "3. What this data is used for",
      body: (
        <p>
          These records support sign-in, profiles, room access, shared playback,
          conversation, invitations and moderation. Access checks and rate
          limits protect accounts and rooms. Presence signals keep occupied
          rooms active and support cleanup of inactive rooms. Local preferences
          remember interface choices.
        </p>
      ),
    },
    {
      id: "profile",
      title: "4. Profile visibility",
      body: (
        <p>
          Profile data is available to you, friends and people sharing an active
          room, according to the service’s access checks. Service administration
          can access account details needed to manage accounts. Uploaded profile
          images are stored privately, checked and re-encoded to remove embedded
          metadata such as camera location.
        </p>
      ),
    },
    {
      id: "rooms",
      title: "5. Rooms and chat",
      body: (
        <>
          <p>
            Public room names, descriptions, fandom associations and current
            media can appear in the catalogue. Private rooms are not listed
            publicly. Messages and attachments are available to active members
            of the room. Users can delete their messages; room owners and
            moderators can moderate their room.
          </p>
          <p>
            Local drafts and locally saved selections remain in the browser.
            They are not shared rooms or a server backup of your data.
          </p>
        </>
      ),
    },
    {
      id: "voice",
      title: "6. Voice and demos",
      body: (
        <>
          <p>
            With the media service configured, voice and demos connect through
            LiveKit when you join or start sharing. Your microphone audio or
            selected tab/window is transmitted live to the other participants.
            Screen-sharing audio depends on the selected source and browser.
            Katsodi does not implement voice-call or demo recording.
          </p>
          <p>
            Microphone testing runs on your device. Demo drawings and pointers
            are sent as live data messages. Other participants can still use
            their own recording tools, so avoid exposing private content.
          </p>
        </>
      ),
    },
    {
      id: "uploads",
      title: "7. Uploaded images",
      body: (
        <p>
          Chat and profile images use the configured file storage. Images are
          checked and re-encoded before use. Chat-image access depends on room
          membership. Avatar and banner images can be removed from account
          settings.
        </p>
      ),
    },
    {
      id: "embeds",
      title: "8. External players and websites",
      body: (
        <>
          <p>
            To recognise a media source or import supported playlists, the
            server may request the submitted URL or a provider API. URLs can
            themselves include personal information; do not submit credentials
            or private access links.
          </p>
          <p>
            External players and websites load in your browser after the
            relevant embedded-media choice. Providers receive connection
            information such as your IP address and can use their own cookies.
            Remote music artwork can also contact its image provider. The
            optional shared browser uses Hyperbeam when enabled; content entered
            there is processed by that provider.
          </p>
          <p>
            Discord, Telegram and other outbound links open separate services
            governed by their own policies.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "9. Browser storage and preferences",
      body: (
        <p>
          Authentication cookies keep you signed in. Browser storage remembers
          language, theme, layout, local drafts and embedded-media choices.
          Clearing site data can remove local information and sign you out.
          Details and controls are in the{" "}
          <Link href="/cookies">Cookie Policy</Link>.
        </p>
      ),
    },
    {
      id: "retention",
      title: "10. Room cleanup",
      body: (
        <p>
          The current room-lifecycle implementation deletes unvisited video
          rooms after 30 minutes and music rooms after 10 days, along with chat,
          chat images, queues and invitations. Account and profile records
          support the account while it exists. For an account-deletion request,
          use the contact below.
        </p>
      ),
    },
    {
      id: "processors",
      title: "11. Services used by these features",
      body: (
        <ul>
          <li>
            Supabase provides authentication, database records, file storage and
            live updates when connected.
          </li>
          <li>
            LiveKit carries voice and demos when the media connection is
            enabled.
          </li>
          <li>Hyperbeam provides the optional shared browser.</li>
          <li>
            External media providers deliver their own players, content and
            related requests.
          </li>
        </ul>
      ),
    },
    {
      id: "security",
      title: "12. Access and protection",
      body: (
        <p>
          Server and database access rules restrict room and account operations.
          Authentication cookies are protected from page scripts, media tokens
          are short-lived, and image uploads are validated. No service can
          guarantee absolute security. Do not share account passwords or private
          information in public rooms.
        </p>
      ),
    },
    {
      id: "rights",
      title: "13. Your data and requests",
      body: (
        <>
          <p>
            Account settings let you edit profile information and remove profile
            images. You can delete your own messages, leave rooms, remove
            friends and block people. Applicable data-protection rights can
            include access, correction, deletion, restriction, objection,
            portability and withdrawal of consent, and complaints to a competent
            supervisory authority.
          </p>
          <p>
            Send other data requests to <OwnerFact field="privacyEmail" /> from
            your account email. Identity confirmation may be needed to avoid
            disclosing data to somebody else.
          </p>
        </>
      ),
    },
    {
      id: "deletion",
      title: "14. Closing an account",
      body: (
        <p>
          To request closure and deletion, write to{" "}
          <OwnerFact field="privacyEmail" />. A self-service account-deletion
          button is not implemented. Clearing browser data removes information
          stored only on that device.
        </p>
      ),
    },
    {
      id: "children",
      title: "15. Minimum age",
      body: (
        <p>
          Katsodi is intended for users aged <OwnerFact field="minimumAge" />{" "}
          and over. If you believe an account was created in breach of this age
          rule, contact <OwnerFact field="privacyEmail" /> for review.
        </p>
      ),
    },
    {
      id: "changes",
      title: "16. Updates",
      body: (
        <p>
          The version and update date identify this description of the service.
          The policy is updated as the implemented features change.
        </p>
      ),
    },
    {
      id: "contact",
      title: "17. Contact",
      body: (
        <p>
          Privacy and data requests: <OwnerFact field="privacyEmail" />. Other
          support information is on the{" "}
          <Link href="/contact">Contact page</Link>.
        </p>
      ),
    },
  ],
};
