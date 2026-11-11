import Link from "next/link";
import { OwnerFact } from "./owner-fact";
import type { LegalDoc } from "./types";

export const guidelines: LegalDoc = {
  slug: "guidelines",
  title: "Community Guidelines",
  summary:
    "How to be good company in Katsodi rooms: what is welcome, what is not, and what happens when rules are broken.",
  version: "0.2",
  updated: "2026-11-10",
  sections: [
    {
      id: "respect",
      title: "1. Be respectful",
      body: (
        <p>
          Katsodi is for watching, listening and talking together. Disagree
          about the plot, the ending or the best album, but argue about ideas,
          not people. Remember that others in a room may be strangers from
          different countries, ages and backgrounds.
        </p>
      ),
    },
    {
      id: "harassment",
      title: "2. No harassment or abuse",
      body: (
        <p>
          Do not threaten, bully, stalk, intimidate or repeatedly contact
          someone who does not want it. If someone blocks you or removes you
          from a room, do not try to reach them another way or with another
          account.
        </p>
      ),
    },
    {
      id: "hate",
      title: "3. No hate speech or discrimination",
      body: (
        <p>
          Content that attacks or demeans people for their ethnicity,
          nationality, religion, disability, sex, gender identity, sexual
          orientation, age or similar characteristics is not allowed, including
          in usernames, room names, stickers and images.
        </p>
      ),
    },
    {
      id: "spam",
      title: "4. No spam or malicious activity",
      body: (
        <p>
          No flooding chats, unsolicited advertising, scams, phishing, malware,
          or links designed to trick people. Do not use link demos or the shared
          browser to show login pages and collect others&rsquo; passwords.
          Katsodi limits how fast messages can be sent; trying to get around
          such limits is itself a violation.
        </p>
      ),
    },
    {
      id: "content",
      title: "5. Prohibited content",
      body: (
        <>
          <p>Never share or link to:</p>
          <ul>
            <li>any sexual content involving minors;</li>
            <li>sexual content involving people who did not consent;</li>
            <li>content that promotes terrorism or graphic violence;</li>
            <li>
              content that encourages self-harm (if you or someone in a room is
              in danger, contact local emergency services);
            </li>
            <li>
              anything else illegal where you or the room&rsquo;s members are.
            </li>
          </ul>
          <p>
            Adult or disturbing content that is legal still needs care: do not
            put it in public rooms or in front of people who did not choose it.
          </p>
        </>
      ),
    },
    {
      id: "rooms",
      title: "6. Public and private rooms",
      body: (
        <>
          <p>
            Public rooms are listed in the catalogue for everyone. Give them an
            honest name and description, link them to the right fandom, and keep
            them welcoming to newcomers. Private rooms are for people you
            invite; the same rules apply inside them.
          </p>
          <p>
            Room owners set the tone. Use moderator rights and removals fairly,
            and do not hand out invites to people who will cause trouble.
          </p>
        </>
      ),
    },
    {
      id: "voice",
      title: "7. Voice and text chat",
      body: (
        <ul>
          <li>Mute yourself when you are not talking and avoid loud noise.</li>
          <li>Let others speak; do not shout over people.</li>
          <li>
            Do not record or screenshot others without asking, and never share
            recordings outside the room without consent.
          </li>
          <li>
            In a link demo, show only the tab you meant to show and stop sharing
            when you are done.
          </li>
        </ul>
      ),
    },
    {
      id: "privacy",
      title: "8. Respect privacy",
      body: (
        <p>
          Do not post other people&rsquo;s personal information (addresses,
          phone numbers, private messages, photos) without their permission, and
          do not try to find out who someone is offline. Keep what people share
          in a private room inside it.
        </p>
      ),
    },
    {
      id: "impersonation",
      title: "9. Impersonation and account misuse",
      body: (
        <p>
          Do not pretend to be another person, a Katsodi administrator or an
          official account of an artist, studio or service. Do not share, sell
          or take over accounts, or create extra accounts to avoid a removal or
          block.
        </p>
      ),
    },
    {
      id: "copyright",
      title: "10. Copyright and sharing content",
      body: (
        <p>
          Play media from official services where it is legally available, and
          do not use rooms to spread pirated copies. Images you upload should be
          your own or properly licensed. Share only material you are authorised
          to transmit or have another lawful basis to share. A subscription or
          access to a source does not itself permit a public screening. See the{" "}
          <Link href="/copyright">Copyright Policy</Link>.
        </p>
      ),
    },
    {
      id: "reporting",
      title: "11. Reporting problems",
      body: (
        <>
          <p>What you can do right now inside Katsodi:</p>
          <ul>
            <li>block a person from your friends page;</li>
            <li>
              leave the room, or, as an owner or moderator, delete the message
              and remove the member;
            </li>
            <li>tell the room owner or a moderator in the room.</li>
          </ul>
          <p>
            A report button is not available yet. Until it is, report serious
            problems to <OwnerFact field="supportEmail" /> with the room
            address, the username involved, the time and, if possible, a
            screenshot. In an emergency, contact local emergency services.
          </p>
        </>
      ),
    },
    {
      id: "actions",
      title: "12. What can happen",
      body: (
        <>
          <p>Depending on how serious and repeated a violation is:</p>
          <ul>
            <li>
              room owners and moderators may delete messages or remove you from
              a room;
            </li>
            <li>we may remove content, a room or a fandom request;</li>
            <li>we may restrict, suspend or close your account;</li>
            <li>
              we may report illegal content to the authorities where the law
              requires it.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "appeals",
      title: "13. Restrictions and appeals",
      body: (
        <p>
          Removals from a room are decided by that room&rsquo;s owner and
          moderators. If we restrict your account and you think we made a
          mistake, reply to our message or write to{" "}
          <OwnerFact field="supportEmail" /> explaining why; a person will
          review it. There is no in-product appeal form yet.
        </p>
      ),
    },
  ],
};
