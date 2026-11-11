"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { Headphones } from "lucide-react";
import { listenInRoom } from "@/lib/server/music-actions";
import { initialResult } from "@/lib/server/contracts";
import { useCurrentRoom, useLocale } from "./workspace-provider";
import { ActionStatus } from "./action-status";

export function ListenInRoom({ url, title }: { url: string; title: string }) {
  const { t } = useLocale();
  const currentRoom = useCurrentRoom();
  const pathname = usePathname();
  const [result, submit, pending] = useActionState(listenInRoom, initialResult);
  return (
    <div className="listen-room-action">
      <form action={submit}>
        <input type="hidden" name="url" value={url} />
        <input type="hidden" name="title" value={title} />
        {currentRoom?.kind === "shared" && (
          <input type="hidden" name="room" value={currentRoom.id} />
        )}
        <button
          className="button button-secondary button-small"
          disabled={pending}
          title={t.musicLibrary.listenHint}
          aria-label={`${t.musicLibrary.listenInRoom}: ${title}`}
        >
          <Headphones size={16} />
          <span>
            {pending ? t.network.pending : t.musicLibrary.listenInRoom}
          </span>
        </button>
      </form>
      {result.code === "auth" ? (
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="text-link"
        >
          {t.musicLibrary.signIn}
        </Link>
      ) : (
        result.status === "error" && <ActionStatus result={result} />
      )}
    </div>
  );
}
