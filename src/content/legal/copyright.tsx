import Link from "next/link";
import { OwnerFact } from "./owner-fact";
import type { LegalDoc } from "./types";

export const copyright: LegalDoc = {
  slug: "copyright",
  title: "Copyright Policy",
  summary:
    "Who owns what on Katsodi, how embedded media is handled, and how rights holders can report infringement.",
  version: "0.2",
  updated: "2026-11-10",
  sections: [
    {
      id: "ours",
      title: "1. Katsodi’s own content",
      body: (
        <p>
          The Katsodi name, logo, interface, code, texts and original
          illustrations belong to the Katsodi project or are used
          under licence. Photographs and other artwork on the site come from the
          sources listed with their licences on the{" "}
          <Link href="/credits">credits page</Link>. Short fandom summaries
          quote Wikipedia under CC BY-SA 4.0 with a link to the source.
        </p>
      ),
    },
    {
      id: "users",
      title: "2. Content users share",
      body: (
        <p>
          Users keep the rights to what they upload and are responsible for it.
          By uploading an image or posting a message you confirm that you own it
          or may share it. Uploading or linking to unauthorised copies of films,
          series, music, books or games is not allowed.
        </p>
      ),
    },
    {
      id: "embeds",
      title: "3. Embedded and linked media",
      body: (
        <>
          <p>
            Katsodi offers external players and links, and can transmit a
            participant-selected screen or window live to a room. The optional
            shared browser displays websites through a separate provider.
            Katsodi does not provide a downloadable film or music library.
            Technical embedding or access to a source does not establish
            permission to transmit the material to other people. Editorial
            fandom links are limited to official destinations; the Discord
            community link is for discussing authorised free viewing, not a
            guarantee about every third-party post or regional availability.
          </p>
          <p>
            Share only material you are authorised to transmit or have another
            lawful basis to share. A subscription or access to a source does not
            itself permit a public screening. Respect copyright and other
            participants’ privacy. Katsodi does not claim distribution rights
            for third-party media. Cover art shown on the music pages is loaded
            from Spotify and belongs to its rights holders.
          </p>
        </>
      ),
    },
    {
      id: "third-party",
      title: "4. Third-party rights and terms",
      body: (
        <p>
          Embedded and linked media stays subject to its rights holders and to
          the terms of the service that publishes it, including regional
          restrictions and subscription requirements. Fandom names, titles and
          trademarks belong to their owners and are used only to describe what a
          room or page is about; this does not imply endorsement.
        </p>
      ),
    },
    {
      id: "notice",
      title: "5. Reporting infringement",
      body: (
        <>
          <p>
            If you believe content on Katsodi infringes your copyright, send a
            notice to <OwnerFact field="copyrightEmail" /> containing:
          </p>
          <ol>
            <li>your name and contact details, and on whose behalf you act;</li>
            <li>the work you believe is infringed;</li>
            <li>
              the exact location on Katsodi (room or page address, and the
              message, image or link concerned);
            </li>
            <li>
              a statement that you believe in good faith that the use is not
              authorised by the rights holder, its agent or the law;
            </li>
            <li>
              a statement that the information in the notice is accurate and
              that you are the rights holder or authorised to act for them;
            </li>
            <li>your physical or electronic signature.</li>
          </ol>
          <p>
            If the media itself is hosted on another service (for example a
            video on YouTube), that service can remove it at the source; please
            contact it as well.
          </p>
        </>
      ),
    },
    {
      id: "review",
      title: "6. How notices are reviewed",
      body: (
        <p>
          A person reviews each complete notice. If it is valid we remove or
          disable access to the content, or remove the room link, and tell the
          user who shared it where we can. Incomplete notices may be returned
          with a request for the missing information. Rooms are short-lived: a
          video room and its chat are deleted 30 minutes after nobody has it
          open (a music room after 10 days), so content reported in an old room
          may already be gone.
        </p>
      ),
    },
    {
      id: "disputes",
      title: "7. Counter-notices and repeat infringement",
      body: (
        <>
          <p>
            If your content was removed and you believe it was a mistake or you
            had the right to share it, you can send a counter-notice to{" "}
            <OwnerFact field="copyrightEmail" /> explaining why, with your
            contact details and a statement made in good faith. We may forward
            it to the person who sent the notice and restore the content where
            the law allows.
          </p>
          <p>
            Accounts that repeatedly infringe copyright may be restricted or
            closed under the <Link href="/terms#termination">Terms</Link>.
            Knowingly false notices or counter-notices can have legal
            consequences.
          </p>
        </>
      ),
    },
  ],
};
