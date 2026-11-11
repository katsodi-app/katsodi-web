"use client";
import { UserAvatar } from "./user-avatar";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Ban, UserMinus, UserPlus, X } from "lucide-react";
import {
  cancelFriendRequest,
  changeFriendship,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/server/friend-actions";
import { initialResult, type ActionResult } from "@/lib/server/contracts";
import { ActionStatus } from "./account-forms";
import { PageIntro } from "./page-design";
import { useWorkspace } from "./workspace-provider";

export type FriendPerson = {
  id: string;
  username: string;
  display_name: string;
  since?: string;
};
export type FriendRequest = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  created_at: string;
};
export type FriendsOverview = {
  friends: FriendPerson[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  blocked: FriendPerson[];
};

/** Refreshes server data after a successful action. */
function useRefreshOnSuccess(result: ActionResult) {
  const router = useRouter();
  useEffect(() => {
    if (result.status === "success") router.refresh();
  }, [result, router]);
}

function Person({
  person,
  children,
}: {
  person: {
    id?: string;
    user_id?: string;
    username: string;
    display_name: string;
    avatar?: boolean;
    version?: string | null;
  };
  children?: React.ReactNode;
}) {
  return (
    <li className="friend-row">
      <UserAvatar
        className="friend-avatar"
        userId={person.user_id || person.id}
        name={person.display_name}
        available={person.avatar ?? true}
        version={person.version}
      />
      <Link href={`/profile/${person.username}`} className="friend-name">
        <strong>{person.display_name}</strong>
        <span>@{person.username}</span>
      </Link>
      <span className="friend-actions">{children}</span>
    </li>
  );
}

function FriendActions({ person }: { person: FriendPerson }) {
  const { t } = useWorkspace();
  const f = t.friends;
  const [result, act, pending] = useActionState(
    changeFriendship,
    initialResult,
  );
  const [confirming, setConfirming] = useState(false);
  useRefreshOnSuccess(result);
  return (
    <form action={act}>
      <input type="hidden" name="user" value={person.id} />
      <button
        name="operation"
        value="remove"
        className="friend-icon"
        disabled={pending}
        aria-label={`${f.remove}: ${person.display_name}`}
        title={f.remove}
      >
        <UserMinus size={16} />
      </button>
      {/* Distinct keys: otherwise React turns the clicked "Block" button into
          the submit button during the same click, and the browser submits it
          as the click's default action, skipping the confirmation. */}
      {confirming ? (
        <button
          key="confirm-block"
          name="operation"
          value="block"
          className="button button-secondary button-small friend-danger"
          disabled={pending}
        >
          {f.blockConfirm}
        </button>
      ) : (
        <button
          key="ask-block"
          type="button"
          className="friend-icon"
          onClick={() => setConfirming(true)}
          aria-label={`${f.block}: ${person.display_name}`}
          title={f.block}
        >
          <Ban size={16} />
        </button>
      )}
      {result.status === "error" && <ActionStatus result={result} />}
    </form>
  );
}

function IncomingActions({ request }: { request: FriendRequest }) {
  const { t } = useWorkspace();
  const f = t.friends;
  const [result, respond, pending] = useActionState(
    respondFriendRequest,
    initialResult,
  );
  useRefreshOnSuccess(result);
  return (
    <form action={respond}>
      <input type="hidden" name="request" value={request.id} />
      <button
        name="accept"
        value="true"
        className="button button-primary button-small"
        disabled={pending}
      >
        <Check size={15} />
        {f.accept}
      </button>
      <button
        name="accept"
        value="false"
        className="friend-icon"
        disabled={pending}
        aria-label={`${f.decline}: ${request.display_name}`}
        title={f.decline}
      >
        <X size={16} />
      </button>
      {result.status === "error" && <ActionStatus result={result} />}
    </form>
  );
}

function OutgoingActions({ request }: { request: FriendRequest }) {
  const { t } = useWorkspace();
  const [result, cancel, pending] = useActionState(
    cancelFriendRequest,
    initialResult,
  );
  useRefreshOnSuccess(result);
  return (
    <form action={cancel}>
      <input type="hidden" name="request" value={request.id} />
      <button
        className="button button-secondary button-small"
        disabled={pending}
      >
        {t.friends.cancel}
      </button>
    </form>
  );
}

function UnblockAction({ person }: { person: FriendPerson }) {
  const { t } = useWorkspace();
  const [result, act, pending] = useActionState(
    changeFriendship,
    initialResult,
  );
  useRefreshOnSuccess(result);
  return (
    <form action={act}>
      <input type="hidden" name="user" value={person.id} />
      <button
        name="operation"
        value="unblock"
        className="button button-secondary button-small"
        disabled={pending}
      >
        {t.friends.unblock}
      </button>
    </form>
  );
}

export function FriendsWorkspace({ overview }: { overview: FriendsOverview }) {
  const { t } = useWorkspace();
  const f = t.friends;
  const [tab, setTab] = useState<"friends" | "requests" | "blocked">(
    overview.incoming.length ? "requests" : "friends",
  );
  const [sent, send, sending] = useActionState(
    sendFriendRequest,
    initialResult,
  );
  useRefreshOnSuccess(sent);
  const counts = {
    friends: overview.friends.length,
    requests: overview.incoming.length + overview.outgoing.length,
    blocked: overview.blocked.length,
  };
  return (
    <>
      <PageIntro
        eyebrow={t.design.personalEyebrow}
        title={t.design.friends}
        description={f.intro}
        motif="people"
      />
      <section className="friends-workspace">
        <form action={send} className="friend-add">
          <label htmlFor="friend-username">{f.addLabel}</label>
          <div>
            <input
              id="friend-username"
              name="username"
              required
              autoComplete="off"
              spellCheck={false}
              maxLength={25}
              placeholder="@username"
            />
            <button className="button button-primary" disabled={sending}>
              <UserPlus size={16} />
              {f.add}
            </button>
          </div>
          {sent.status === "success" && sent.friend && (
            <p className="notice" role="status">
              {f[`outcome_${sent.friend}`]}
            </p>
          )}
          {sent.status === "error" && <ActionStatus result={sent} />}
        </form>
        <div className="brand-tab-buttons" role="group" aria-label={f.lists}>
          {(["friends", "requests", "blocked"] as const).map((key) => (
            <button
              key={key}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {f[`tab_${key}`]}
              {counts[key] > 0 && (
                <span className="room-tab-count">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>
        {tab === "friends" &&
          (overview.friends.length ? (
            <ul className="friend-list">
              {overview.friends.map((person) => (
                <Person key={person.id} person={person}>
                  <FriendActions person={person} />
                </Person>
              ))}
            </ul>
          ) : (
            <p className="friend-empty">{f.emptyFriends}</p>
          ))}
        {tab === "requests" && (
          <>
            <h2 className="room-panel-title">{f.incoming}</h2>
            {overview.incoming.length ? (
              <ul className="friend-list">
                {overview.incoming.map((request) => (
                  <Person key={request.id} person={request}>
                    <IncomingActions request={request} />
                  </Person>
                ))}
              </ul>
            ) : (
              <p className="friend-empty">{f.emptyIncoming}</p>
            )}
            <h2 className="room-panel-title">{f.outgoing}</h2>
            {overview.outgoing.length ? (
              <ul className="friend-list">
                {overview.outgoing.map((request) => (
                  <Person key={request.id} person={request}>
                    <OutgoingActions request={request} />
                  </Person>
                ))}
              </ul>
            ) : (
              <p className="friend-empty">{f.emptyOutgoing}</p>
            )}
          </>
        )}
        {tab === "blocked" &&
          (overview.blocked.length ? (
            <ul className="friend-list">
              {overview.blocked.map((person) => (
                <Person key={person.id} person={person}>
                  <UnblockAction person={person} />
                </Person>
              ))}
            </ul>
          ) : (
            <p className="friend-empty">{f.emptyBlocked}</p>
          ))}
        <p className="friend-privacy">{f.privacy}</p>
      </section>
    </>
  );
}
