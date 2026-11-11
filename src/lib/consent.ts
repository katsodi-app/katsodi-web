"use client";
import { useSyncExternalStore } from "react";
import { consentKey, consentVersion } from "./consent-bootstrap";

/**
 * The visitor's choice about embedded third-party media (players and
 * websites that may set their own cookies). Katsodi itself only uses
 * strictly necessary storage, so this is the only consent it asks for.
 * Stored on this device; bump `consentVersion` if the choice ever needs to
 * cover something new, which asks everyone again.
 */
export { consentKey, consentVersion };
export type Consent = { v: number; externalMedia: boolean; at: string };

const changed = "katsodi:consent";
let cache: { raw: string | null; value: Consent | null } = {
  raw: null,
  value: null,
};

function read(): Consent | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(consentKey);
  } catch {
    return cache.value;
  }
  if (raw === cache.raw) return cache.value;
  let value: Consent | null = null;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      parsed.v === consentVersion &&
      typeof parsed.externalMedia === "boolean" &&
      typeof parsed.at === "string"
    )
      value = parsed;
  } catch {
    value = null;
  }
  cache = { raw, value };
  return value;
}

export function saveConsent(externalMedia: boolean) {
  const value: Consent = {
    v: consentVersion,
    externalMedia,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(consentKey, JSON.stringify(value));
  } catch {
    // Storage blocked: keep the choice for this page view only.
    cache = { raw: JSON.stringify(value), value };
  }
  window.dispatchEvent(new Event(changed));
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === consentKey) notify();
  };
  window.addEventListener(changed, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changed, notify);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * `undefined` while rendering on the server (no choice is known yet),
 * `null` when the visitor has not chosen, otherwise their choice.
 */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
