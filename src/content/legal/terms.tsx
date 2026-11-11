import Link from "next/link";
import { OwnerFact } from "./owner-fact";
import type { LegalDoc } from "./types";
import { termsVersion } from "./versions";

export const terms: LegalDoc = {
  slug: "terms",
  title: "Terms of Service",
  summary:
    "The rules for using Katsodi: your account, rooms, chat and voice, what you share, and what we can and cannot promise.",
  version: termsVersion,
  updated: "2026-11-11",
  sections: [
    {
      id: "introduction",
      title: "1. Introduction and scope",
      body: (
        <>
          <p>
            Katsodi is a website where people create rooms to watch videos,
            listen to music and talk together: in text chat, in voice, and
            through shared links, link demos and an optional shared browser.
            These Terms of Service (&ldquo;Terms&rdquo;) are an agreement
            between you and the Katsodi project (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;).
          </p>
          <p>
            They apply to everything on the site: browsing without an account,
            local rooms kept in your browser, and shared rooms that need an
            account. Our <Link href="/privacy">Privacy Policy</Link>,{" "}
            <Link href="/cookies">Cookie Policy</Link>,{" "}
            <Link href="/guidelines">Community Guidelines</Link> and{" "}
            <Link href="/copyright">Copyright Policy</Link> are part of these
            Terms. If you do not agree, please do not create an account or use
            shared rooms.
          </p>
        </>
      ),
    },
    {
      id: "eligibility",
      title: "2. Eligibility and registration",
      body: (
        <>
          <p>
            You must be at least <OwnerFact field="minimumAge" /> years old, or
            older if the law where you live requires it, to create an account.
            If you are under the age of majority where you live, you confirm
            that a parent or guardian has agreed to these Terms.
          </p>
          <p>
            To register you give an email address and a password of at least 12
            characters, and confirm the address through the link we send. You
            may then choose a display name and an @username. Information you
            give must be your own and accurate; one person may not create
            accounts to get around a block, a removal or a restriction.
          </p>
        </>
      ),
    },
    {
      id: "account",
      title: "3. Your account",
      body: (
        <>
          <p>
            You are responsible for keeping your password secret and for what
            happens under your account. Tell us promptly at{" "}
            <OwnerFact field="supportEmail" /> if you think someone else has
            access to it; you can change your password from the sign-in page
            with &ldquo;Forgot password&rdquo;.
          </p>
          <p>
            Some data stays in your browser rather than in your account: local
            rooms, saved rooms, followed fandoms on the device, theme and
            language. Clearing your browser data removes it, and we cannot
            restore it.
          </p>
        </>
      ),
    },
    {
      id: "conduct",
      title: "4. Acceptable and prohibited behaviour",
      body: (
        <>
          <p>
            Use Katsodi lawfully and in line with the{" "}
            <Link href="/guidelines">Community Guidelines</Link>. In particular,
            you must not:
          </p>
          <ul>
            <li>
              harass, threaten, impersonate or discriminate against others, or
              share their personal information without permission;
            </li>
            <li>
              post or link to content that is illegal, sexually exploits minors,
              promotes violence or infringes someone else&rsquo;s rights;
            </li>
            <li>
              send spam, malware or phishing links, or flood rooms with messages
              (the service limits how often messages can be sent);
            </li>
            <li>
              try to access rooms, accounts or data you are not allowed to,
              probe or overload the service, or get around access checks,
              removals or blocks;
            </li>
            <li>
              record or redistribute other people&rsquo;s voice, video or
              messages without their consent;
            </li>
            <li>
              use automated means to create accounts or collect data from the
              site.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "rooms",
      title: "5. Rooms",
      body: (
        <>
          <p>
            Anyone with an account can create a shared room. Public rooms appear
            in the catalogue; selecting a fandom is optional (otherwise the room
            is tagged Other). Private rooms are reached only through invites.
            The person who creates a room is its owner and can name moderators.
            Owners and moderators can change what the room plays, approve or end
            link demos, and remove members; removed members lose access to the
            room&rsquo;s chat, player, voice and shared browser.
          </p>
          <p>
            Room owners are responsible for what they choose to play or show and
            for moderating their room fairly. A role given in a room applies
            only to that room and resets when a member leaves and rejoins.
          </p>
          <p>
            Rooms are temporary. A shared video room that nobody has had open
            for 10 minutes is marked inactive, and after 30 minutes it is
            deleted together with its chat history, chat images, queue and
            invites. A music room is deleted the same way once nobody has opened
            it for 10 days. Keep anything you want to keep elsewhere.
          </p>
        </>
      ),
    },
    {
      id: "communication",
      title: "6. Text and voice communication",
      body: (
        <>
          <p>
            Chat messages, stickers and images are visible to the members of the
            room. Voice chat and link demos are carried live through our
            real-time media provider (see the{" "}
            <Link href="/privacy#processors">Privacy Policy</Link>); Katsodi
            itself does not record voice calls or demos. Other participants
            could still record what they see or hear with their own tools, so
            share accordingly.
          </p>
          <p>
            When you run a link demo, others see the tab you choose to share.
            Close anything private before you start, and stop sharing when you
            are done. Room owners and moderators can pause or end a demo.
          </p>
        </>
      ),
    },
    {
      id: "your-content",
      title: "7. Content you upload or share",
      body: (
        <>
          <p>
            &ldquo;Your content&rdquo; means anything you put on Katsodi:
            messages, images, your avatar and banner, your profile text, links
            you add to a room&rsquo;s player, queue or website tab, demo links
            and fandom requests. You keep any rights you have in it.
          </p>
          <p>
            You give us a worldwide, non-exclusive, royalty-free licence to
            store, process, re-encode and display your content only as needed to
            run Katsodi for you and the people you share it with. Uploaded
            images are re-encoded and their embedded metadata (such as location)
            is removed. The licence ends when the content is deleted from the
            service, except for copies we must keep by law.
          </p>
          <p>
            You confirm that you have the right to share your content and that
            it does not break these Terms or anyone else&rsquo;s rights.
          </p>
        </>
      ),
    },
    {
      id: "third-party",
      title: "8. Third-party services and external links",
      body: (
        <>
          <p>
            Katsodi offers external players and live screen sharing, rather than
            a downloadable film or music library. Players for YouTube, VK Video,
            Rutube, Twitch, SoundCloud, Vimeo, Dailymotion, Spotify and other
            services are loaded from those services, and links on fandom and
            music pages lead to them. Their own terms, privacy policies,
            regional availability, subscriptions and age limits apply. Some
            services do not allow embedding; Katsodi then offers to open them in
            a new tab.
          </p>
          <p>
            The optional shared browser is provided by a third-party virtual
            browser service. We do not control third-party services and are not
            responsible for their content or availability, except where the law
            provides otherwise. A subscription or permission to view content
            does not itself authorise transmitting it to a room. Share only
            material you are authorised to transmit or have another lawful basis
            to share, and respect participants’ privacy.
          </p>
        </>
      ),
    },
    {
      id: "ip",
      title: "9. Intellectual property",
      body: (
        <p>
          Katsodi&rsquo;s own design, code, texts and illustrations belong to{" "}
          the Katsodi project or its licensors. Fandom names, titles,
          artwork and music belong to their respective rights holders; image
          sources are listed on the <Link href="/credits">credits</Link> page.
          Showing them does not mean those rights holders endorse Katsodi.
          Katsodi does not claim any licence to distribute third-party films or
          music. How to report infringement is explained in the{" "}
          <Link href="/copyright">Copyright Policy</Link>.
        </p>
      ),
    },
    {
      id: "ugc",
      title: "10. Responsibility for user content",
      body: (
        <p>
          Content in rooms comes from users, not from us. We do not review it
          before it appears. We may remove content or restrict access when it
          breaks these Terms or the law, or when a rights holder or authority
          asks us to with a valid request. In-product reporting is not available
          yet; until it is, report problems as described on the{" "}
          <Link href="/contact">Contact page</Link>.
        </p>
      ),
    },
    {
      id: "termination",
      title: "11. Restrictions, suspension and termination",
      body: (
        <>
          <p>
            Room owners and moderators can remove members from their rooms. We
            may restrict, suspend or close an account that seriously or
            repeatedly breaks these Terms, puts others at risk, or where the law
            requires it. Where reasonable we will tell you why and how to
            respond, using the email address on your account.
          </p>
          <p>
            You may stop using Katsodi at any time. The site does not yet have a
            self-service &ldquo;delete account&rdquo; button; to close your
            account, write to <OwnerFact field="privacyEmail" /> from the email
            address of the account.
          </p>
        </>
      ),
    },
    {
      id: "availability",
      title: "12. Availability and changes to the service",
      body: (
        <p>
          Katsodi is under active development. Features may change, be paused or
          be removed, and the service may be unavailable for maintenance or
          because a provider it depends on (database, voice, embeds) is down.
          Voice and link demos do not currently work on phones. We do not
          promise that the service will be uninterrupted or error-free, or that
          any third-party content will stay available.
        </p>
      ),
    },
    {
      id: "liability",
      title: "13. Liability",
      body: (
        <>
          <p>
            Katsodi is provided free of charge and &ldquo;as is&rdquo;. To the
            extent the law allows, we are not liable for indirect or
            consequential loss, for loss of data kept only in your browser, for
            content posted by other users, or for third-party services.
          </p>
          <p>
            Nothing in these Terms limits liability that cannot be limited by
            law, such as liability for intent or gross negligence, or your
            statutory rights as a consumer, including the protection of
            mandatory consumer law where you live.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "14. Changes to these Terms",
      body: (
        <p>
          We may update these Terms as Katsodi changes. Every version shows its
          number and the date it was last updated at the top of this page, and
          the version you accepted is recorded with your account when you sign
          up. Before a material change takes effect we will announce it on the
          site and, where the law requires it, ask you to accept the new
          version; minor changes (wording, corrections) are published here
          directly.
        </p>
      ),
    },
    {
      id: "contact",
      title: "15. Contact and legal notices",
      body: (
        <p>
          Email:{" "}
          <OwnerFact field="supportEmail" />. More ways to reach us are on the{" "}
          <Link href="/contact">Contact page</Link>.
        </p>
      ),
    },
  ],
};
