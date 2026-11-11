"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { saveConsent, useConsent } from "@/lib/consent";
import { useLocale } from "./workspace-provider";

/**
 * Asks once about embedded third-party media. Both choices are equal
 * buttons; nothing third-party loads before a choice. The choice can be
 * changed on /cookies (CookiePreferences).
 */
export function ConsentBanner() {
  const consent = useConsent();
  const pathname = usePathname();
  const { t } = useLocale();
  const c = t.consent;
  // Not chosen yet: ask. The server (undefined) renders the banner too, so it
  // paints with the page instead of appearing after hydration; a stored
  // choice hides it before first paint (consentBootstrap) and removes it here.
  const unchosen = consent === null;
  useEffect(() => {
    // A choice cleared in another tab must show the banner again.
    if (unchosen) delete document.documentElement.dataset.consent;
  }, [unchosen]);
  // The cookie page has the same controls inline.
  if (consent || pathname === "/cookies") return null;
  return (
    <section
      className="consent-banner"
      role="region"
      aria-labelledby="consent-title"
    >
      <div>
        <h2 id="consent-title">{c.title}</h2>
        <p>
          {c.text}{" "}
          <Link href="/cookies" className="text-link">
            {c.learnMore}
          </Link>
        </p>
      </div>
      <div className="consent-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => saveConsent(false)}
        >
          {c.necessaryOnly}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => saveConsent(true)}
        >
          {c.allowMedia}
        </button>
      </div>
    </section>
  );
}

/** The same choice, shown and changeable on the Cookie Policy page. */
export function CookiePreferences() {
  const consent = useConsent();
  const { t, locale } = useLocale();
  const c = t.consent;
  const allowed = consent?.externalMedia === true;
  return (
    <div className="cookie-preferences brand-surface">
      <fieldset>
        <legend>{c.preferences}</legend>
        <label>
          <input type="checkbox" checked disabled />
          <span>
            <strong>{c.necessary}</strong>
            <small>{c.necessaryHint}</small>
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={allowed}
            disabled={consent === undefined}
            onChange={(event) => saveConsent(event.target.checked)}
          />
          <span>
            <strong>{c.media}</strong>
            <small>{c.mediaHint}</small>
          </span>
        </label>
      </fieldset>
      <p role="status" className="form-hint">
        {consent
          ? `${c.saved}: ${allowed ? c.allowedState : c.blockedState} · ${new Intl.DateTimeFormat(
              locale,
              { dateStyle: "medium", timeStyle: "short" },
            ).format(new Date(consent.at))}`
          : consent === null
            ? c.notChosen
            : ""}
      </p>
    </div>
  );
}
