import Link from "next/link";
import { OwnerFact } from "./owner-fact";
import type { LegalDoc } from "./types";

export const contact: LegalDoc = {
  slug: "contact",
  title: "Contact & Support",
  summary:
    "Where to get help with Katsodi, and how to send technical, privacy, safety and copyright requests.",
  version: "0.1",
  updated: "2026-11-11",
  informational: true,
  sections: [
    {
      id: "channels",
      title: "Contact details",
      body: (
        <dl className="legal-contacts">
          <div>
            <dt>Support and technical issues</dt>
            <dd>
              <OwnerFact field="supportEmail" />
            </dd>
          </div>
          <div>
            <dt>Privacy and data requests</dt>
            <dd>
              <OwnerFact field="privacyEmail" />
            </dd>
          </div>
          <div>
            <dt>Copyright notices</dt>
            <dd>
              <OwnerFact field="copyrightEmail" />
            </dd>
          </div>
          <div>
            <dt>Project and country of operation</dt>
            <dd>
              Katsodi (unregistered project),{" "}
              <OwnerFact field="operatingCountry" />
            </dd>
          </div>
        </dl>
      ),
    },
    {
      id: "technical",
      title: "Technical problems",
      body: (
        <>
          <p>Before writing, a few things that solve most problems:</p>
          <ul>
            <li>
              Open the site at its usual address and reload the page; sign out
              and in again if a room says you have no access.
            </li>
            <li>
              If a player shows a placeholder, it is waiting for your choice
              about embedded media — press &ldquo;Load once&rdquo; or change
              your <Link href="/cookies#preferences">preferences</Link>.
            </li>
            <li>
              Some videos cannot be embedded by their service; use &ldquo;Open
              in a new tab&rdquo;.
            </li>
            <li>
              Voice and link demos do not work on phones yet; use a desktop
              browser (Chrome or Edge for demos).
            </li>
          </ul>
          <p>
            If it still fails, email support with what you did, what happened,
            the page address, your browser and device, and a screenshot if you
            can. Do not send your password.
          </p>
        </>
      ),
    },
    {
      id: "privacy",
      title: "Privacy requests",
      body: (
        <p>
          To access, correct, export or delete your data, or to close your
          account, write to the privacy address above from the email address of
          your account. The <Link href="/privacy#rights">Privacy Policy</Link>{" "}
          explains your rights and what you can already do yourself in your
          account settings.
        </p>
      ),
    },
    {
      id: "safety",
      title: "Reporting people or content",
      body: (
        <p>
          In a room, you can block a person, leave, or ask the room owner or a
          moderator to remove a message or member. For anything serious, email
          support with the room address, the username, the time and a
          screenshot. A report button inside Katsodi is not available yet. See
          the <Link href="/guidelines#reporting">Community Guidelines</Link>.
        </p>
      ),
    },
    {
      id: "copyright",
      title: "Copyright concerns",
      body: (
        <p>
          Send copyright notices to the copyright address above with the details
          listed in the <Link href="/copyright#notice">Copyright Policy</Link>.
        </p>
      ),
    },
    {
      id: "fandoms",
      title: "Missing a fandom?",
      body: (
        <p>
          Signed-in users can suggest a new fandom on the{" "}
          <Link href="/fandoms/request">fandom request page</Link>; you will see
          the decision there.
        </p>
      ),
    },
  ],
};
