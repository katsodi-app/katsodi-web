"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowUpRight, Send, Sparkles } from "lucide-react";
import { requestFandom } from "@/lib/server/fandom-actions";
import { initialResult } from "@/lib/server/contracts";
import { categories } from "@/lib/fandoms";
import type { FandomRequest } from "@/lib/community-fandoms";
import { ActionStatus } from "./account-forms";
import { PageIntro } from "./page-design";
import { useWorkspace } from "./workspace-provider";

export type FandomRequestState =
  | { status: "signed-out" | "unconfigured" | "unavailable" }
  | { status: "ready"; requests: FandomRequest[] };

export function RequestStatus({ request }: { request: FandomRequest }) {
  const { t } = useWorkspace();
  const r = t.fandomRequest;
  return (
    <span className={`request-status request-${request.status}`}>
      {r[`status_${request.status}`]}
    </span>
  );
}

/** Task 8: members ask for a fandom that is not in the catalogue yet. */
export function FandomRequestPage({ state }: { state: FandomRequestState }) {
  const { t, locale } = useWorkspace();
  const r = t.fandomRequest;
  const [result, submit, pending] = useActionState(
    requestFandom,
    initialResult,
  );
  return (
    <>
      <PageIntro
        eyebrow={r.eyebrow}
        title={r.title}
        description={r.intro}
        motif="fandom"
      />
      {state.status === "signed-out" ? (
        <section className="brand-surface request-panel">
          <p>{r.signIn}</p>
          <Link href="/login" className="button button-primary">
            {t.network.login}
            <ArrowUpRight size={16} />
          </Link>
        </section>
      ) : state.status !== "ready" ? (
        <p className="notice" role="status">
          {state.status === "unconfigured"
            ? t.network.notConfigured
            : r.unavailable}
        </p>
      ) : (
        <div className="request-layout">
          <form action={submit} className="form-card request-form">
            <h2>{r.formTitle}</h2>
            <label htmlFor="fandom-name">{r.name}</label>
            <input
              id="fandom-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              placeholder={r.namePlaceholder}
              autoComplete="off"
              disabled={pending}
            />
            <label htmlFor="fandom-category">{r.category}</label>
            <select
              id="fandom-category"
              name="category"
              required
              defaultValue="cinema"
              disabled={pending}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {t[c]}
                </option>
              ))}
            </select>
            <label htmlFor="fandom-note">{r.note}</label>
            <textarea
              id="fandom-note"
              name="note"
              maxLength={500}
              rows={3}
              placeholder={r.notePlaceholder}
              disabled={pending}
            />
            <p className="form-hint">{r.hint}</p>
            <button className="button button-primary" disabled={pending}>
              <Send size={16} />
              {pending ? t.network.pending : r.submit}
            </button>
            <ActionStatus result={result} />
          </form>
          <section className="brand-surface request-history">
            <h2>{r.mine}</h2>
            {state.requests.length ? (
              <ul className="request-list">
                {state.requests.map((request) => (
                  <li key={request.id}>
                    <div>
                      <strong>{request.name}</strong>
                      <span>
                        {t[request.category]} ·{" "}
                        {new Date(request.created_at).toLocaleDateString(
                          locale,
                          { day: "numeric", month: "long" },
                        )}
                      </span>
                      {request.reason && (
                        <p className="request-reason">
                          {r.reason}: {request.reason}
                        </p>
                      )}
                    </div>
                    <RequestStatus request={request} />
                    {request.status === "approved" && request.fandom_id && (
                      <Link
                        href={`/fandoms/${request.fandom_id}`}
                        className="text-link"
                      >
                        <Sparkles size={15} />
                        {r.open}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{r.none}</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
