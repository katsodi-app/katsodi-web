"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  signIn,
  signOut,
  signUp,
  recoverPassword,
  resetPassword,
  resendConfirmation,
} from "@/lib/server/auth-actions";
import { initialResult } from "@/lib/server/contracts";
import { useWorkspace } from "./workspace-provider";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  AudioLines,
  ArrowLeft,
} from "lucide-react";
import { PageIntro, StatePanel } from "./page-design";

import { ActionStatus } from "./action-status";
export { ActionStatus } from "./action-status";
export function BackendNotice() {
  const { t } = useWorkspace();
  return (
    <div className="notice backend-notice">
      <p>{t.network.notConfigured}</p>
      <p>{t.network.connectHint}</p>
      <Link href="/rooms" className="text-link">
        {t.network.localDrafts}
      </Link>
    </div>
  );
}
export type AuthMode = "login" | "signup" | "forgot" | "reset" | "verify";
export function AuthForm({
  mode,
  configured,
  signedIn,
  next = "/account",
  confirmationError = false,
  otherBrowser = false,
  emailConfirmed = false,
}: {
  mode: AuthMode;
  configured: boolean;
  signedIn: boolean;
  next?: string;
  confirmationError?: boolean;
  /** Recovery link opened outside the browser that requested it. */
  otherBrowser?: boolean;
  /** Sign-up link verified, but the session belongs to another browser. */
  emailConfirmed?: boolean;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const action =
    mode === "signup"
      ? signUp
      : mode === "forgot"
        ? recoverPassword
        : mode === "reset"
          ? resetPassword
          : mode === "verify"
            ? resendConfirmation
            : signIn;
  const [result, submit, pending] = useActionState(action, initialResult);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const sent =
    result.status === "success" &&
    result.code === "sent" &&
    !editingEmail &&
    !pending;
  const title =
    mode === "signup"
      ? n.signup
      : mode === "forgot"
        ? n.forgot
        : mode === "reset"
          ? n.reset
          : mode === "verify"
            ? n.verify
            : n.login;
  return (
    <section className="auth-layout">
      <aside className="auth-story">
        <p className="auth-eyebrow">{n.authEyebrow}</p>
        <h2>{n.authStory}</h2>
        <p className="auth-story-hint">{n.authStoryHint}</p>
        <div className="auth-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
          <div>
            <AudioLines size={60} strokeWidth={1.3} />
          </div>
        </div>
        <div className="auth-story-footer">
          <span className="status-dot" />
          {n.authTogether}
          <span>katsodi.</span>
        </div>
      </aside>
      <div className="auth-form-side">
        <div className="auth-card">
          {!sent && (mode === "login" || mode === "signup") && (
            <nav className="auth-tabs" aria-label={n.account}>
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                aria-current={mode === "login" ? "page" : undefined}
              >
                {n.login}
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(next)}`}
                aria-current={mode === "signup" ? "page" : undefined}
              >
                {n.signup}
              </Link>
            </nav>
          )}
          {sent ? (
            <div className="auth-inbox" role="status">
              <span className="auth-mail-icon">
                <Mail size={30} />
              </span>
              <h1>{n.inboxTitle}</h1>
              <p>{n.inboxHint}</p>
              <strong className="auth-email-address">{email}</strong>
              <p className="auth-inbox-steps">{n.inboxSteps}</p>
              <Link
                className="button button-primary auth-submit"
                href={`/login?next=${encodeURIComponent(next)}`}
              >
                {n.inboxContinue}
                <ArrowRight size={18} />
              </Link>
              <Link
                href={`/verify-email?next=${encodeURIComponent(next)}`}
                className="auth-text-link"
              >
                {n.resend}
              </Link>
              <button
                className="auth-text-link"
                type="button"
                onClick={() => setEditingEmail(true)}
              >
                {n.anotherEmail}
              </button>
            </div>
          ) : (
            <>
              {mode !== "login" && mode !== "signup" && (
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="auth-back-link"
                >
                  <ArrowLeft size={16} />
                  {n.backLogin}
                </Link>
              )}
              <div className="auth-heading">
                <h1>{title}</h1>
                <p>
                  {mode === "login"
                    ? n.loginIntro
                    : mode === "signup"
                      ? n.signupIntro
                      : mode === "forgot"
                        ? n.recoveryIntro
                        : mode === "verify"
                          ? n.verifyBrowser
                          : n.resetIntro}
                </p>
              </div>
              {!configured && <BackendNotice />}
              {confirmationError && (
                <p role="alert" className="error">
                  {n.confirmationFailed}{" "}
                  <Link
                    href={`/verify-email?next=${encodeURIComponent(next)}`}
                    className="auth-text-link"
                  >
                    {n.resend}
                  </Link>
                </p>
              )}
              {emailConfirmed && (
                <p role="status" className="notice">
                  {n.emailConfirmedSignIn}
                </p>
              )}
              {otherBrowser && (
                <p role="alert" className="error">
                  {n.recoveryOtherBrowser}
                </p>
              )}
              <form
                action={submit}
                className="auth-form"
                onSubmit={() => setEditingEmail(false)}
              >
                <input type="hidden" name="next" value={next} />
                {mode !== "reset" && (
                  <label>
                    {n.email}
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!configured}
                    />
                  </label>
                )}
                {mode !== "forgot" && mode !== "verify" && (
                  <>
                    <div className="auth-password-field">
                      <div className="auth-label-row">
                        <label htmlFor="auth-password">{n.password}</label>
                        {mode === "login" && (
                          <Link href="/forgot-password">{n.forgot}</Link>
                        )}
                      </div>
                      <div className="auth-password-input">
                        <input
                          id="auth-password"
                          aria-describedby={
                            mode !== "login" ? "password-hint" : undefined
                          }
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={
                            mode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          required
                          minLength={12}
                          maxLength={128}
                          disabled={!configured}
                        />
                        <button
                          type="button"
                          aria-label={
                            showPassword ? n.hidePassword : n.showPassword
                          }
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff size={19} />
                          ) : (
                            <Eye size={19} />
                          )}
                        </button>
                      </div>
                      {mode !== "login" && (
                        <small id="password-hint">{n.passwordHint}</small>
                      )}
                    </div>
                  </>
                )}
                {mode === "reset" && (
                  <label>
                    {n.confirmPassword}
                    <input
                      name="confirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      disabled={!configured || !signedIn}
                    />
                  </label>
                )}
                {mode === "reset" && !signedIn && configured && (
                  <p className="error">{n.loginRequired}</p>
                )}
                {mode === "signup" && (
                  <label className="auth-consent">
                    <input
                      type="checkbox"
                      name="terms"
                      value="accepted"
                      required
                      disabled={!configured}
                    />
                    <span>
                      {n.termsAgree.split(/({terms}|{privacy})/).map((part) =>
                        part === "{terms}" ? (
                          <Link key={part} href="/terms" target="_blank">
                            {n.termsLink}
                          </Link>
                        ) : part === "{privacy}" ? (
                          <Link key={part} href="/privacy" target="_blank">
                            {n.privacyLink}
                          </Link>
                        ) : (
                          part
                        ),
                      )}
                    </span>
                  </label>
                )}
                <button
                  className="button button-primary auth-submit"
                  disabled={
                    !configured || pending || (mode === "reset" && !signedIn)
                  }
                >
                  {pending
                    ? n.pending
                    : mode === "forgot"
                      ? n.recover
                      : mode === "reset"
                        ? n.save
                        : mode === "verify"
                          ? n.resend
                          : title}
                  <ArrowRight size={18} />
                </button>
                <ActionStatus result={result} />
                {mode === "login" && result.code === "auth" && (
                  <Link
                    href={`/verify-email?next=${encodeURIComponent(next)}`}
                    className="auth-text-link"
                  >
                    {n.verify}
                  </Link>
                )}
              </form>
              {(mode === "login" || mode === "signup") && (
                <p className="auth-switch-note">
                  {mode === "login" ? n.noAccount : n.hasAccount}{" "}
                  <Link
                    href={`/${mode === "login" ? "signup" : "login"}?next=${encodeURIComponent(next)}`}
                  >
                    {mode === "login" ? n.signup : n.login}
                  </Link>
                </p>
              )}
            </>
          )}
          <p className="auth-footnote">{n.accountNote}</p>
        </div>
      </div>
    </section>
  );
}
export { ProfileForm, type ProfileData } from "./profile-settings";
export function AccountAccess({
  configured,
  error = false,
}: {
  configured: boolean;
  error?: boolean;
}) {
  const { t } = useWorkspace();
  return (
    <section className="form-page account-page">
      <PageIntro
        eyebrow={t.design.personalEyebrow}
        title={t.network.account}
        description={t.design.accountGateHint}
        motif="people"
      />
      <StatePanel
        title={t.design.accountGate}
        description={error ? t.network.backendError : t.design.accountGateHint}
        motif="people"
      >
        {error ? (
          <>
            <p role="alert">{t.network.backendError}</p>
            <form action={signOut}>
              <button className="button button-secondary">
                {t.network.logout}
              </button>
            </form>
          </>
        ) : configured ? (
          <>
            <p>{t.network.loginRequired}</p>
            <Link href="/login" className="button button-primary">
              {t.network.login}
            </Link>
          </>
        ) : (
          <BackendNotice />
        )}
      </StatePanel>
    </section>
  );
}
