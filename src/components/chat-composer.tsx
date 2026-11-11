"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ImagePlus,
  Smile,
  X,
  LoaderCircle,
  MonitorPlay,
} from "lucide-react";
import {
  requestDemo,
  sendMessage,
  sendSticker,
} from "@/lib/server/room-actions";
import { inspectSource } from "@/lib/providers";
import { canPresentDemo } from "@/lib/demo";
import { initialResult, type ActionResult } from "@/lib/server/contracts";
import {
  MAX_IMAGE_INPUT,
  IMAGE_TYPES,
  stickerIds,
  type StickerId,
} from "@/lib/chat-media";
import { ChatSticker } from "./chat-sticker";
import { ActionStatus } from "./account-forms";
import { useWorkspace } from "./workspace-provider";

export function ChatComposer({
  room,
  mediaEnabled,
  onSent,
  demoEnabled = false,
  onDemo,
}: {
  room: string;
  mediaEnabled: boolean;
  onSent: () => void;
  /** Link demos are available and none is running or waiting. */
  demoEnabled?: boolean;
  onDemo?: () => void;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const [body, setBody] = useState("");
  const [picker, setPicker] = useState(false);
  const [sticker, setSticker] = useState<StickerId | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [demoPending, setDemoPending] = useState(false);
  // Read after hydration: the server cannot know the device.
  const [canPresent, setCanPresent] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A browser capability known only on the client.
    setCanPresent(canPresentDemo());
  }, []);
  // A demo needs exactly one public https link as the message.
  const demoLink =
    !sticker && !file && /^https:\/\/\S+$/.test(body.trim())
      ? inspectSource(body.trim())?.url
      : undefined;
  async function launchDemo() {
    if (!demoLink) return;
    setDemoPending(true);
    const data = new FormData();
    data.set("room", room);
    data.set("url", demoLink);
    const outcome = await requestDemo(initialResult, data);
    setDemoPending(false);
    if (outcome.status === "success") {
      setBody("");
      setFileError("");
      onSent();
      onDemo?.();
    } else
      setFileError(
        outcome.code === "demoBusy"
          ? n.demoBusy
          : outcome.code === "rateLimit"
            ? n.rateLimit
            : n.demoUnavailable,
      );
  }
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const url = file ? URL.createObjectURL(file) : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A browser object URL belongs to this selected file and is revoked on cleanup.
    setPreview(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);
  const [result, submit, pending] = useActionState(
    async (prev: ActionResult, form: FormData): Promise<ActionResult> => {
      let response: ActionResult;
      if (file) {
        const data = new FormData();
        data.set("image", file);
        try {
          const request = await fetch(`/api/rooms/${room}/images`, {
            method: "POST",
            body: data,
          });
          const json = await request.json();
          if (!request.ok) {
            setFileError(
              n[
                json.code as
                  | "invalidImage"
                  | "imageTooLarge"
                  | "mediaUnavailable"
                  | "rateLimit"
              ] || n.failed,
            );
            return { status: "idle" };
          }
          response = { status: "success", code: "saved" };
        } catch {
          setFileError(n.failed);
          return { status: "idle" };
        }
      } else
        response = sticker
          ? await sendSticker(prev, form)
          : await sendMessage(prev, form);
      if (response.status === "success") {
        if (!file && !sticker) setBody("");
        setSticker(null);
        setFile(null);
        setFileError("");
        setPicker(false);
        onSent();
      }
      return response;
    },
    initialResult,
  );
  return (
    <form
      action={submit}
      className="chat-composer modern-composer"
      ref={formRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPicker(false);
      }}
    >
      <input type="hidden" name="room" value={room} />
      {sticker && <input type="hidden" name="sticker" value={sticker} />}
      {(sticker || preview) && (
        <div className="chat-attachment-preview">
          {sticker ? (
            <ChatSticker id={sticker} label={n[`sticker${sticker}`]} />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- A temporary local blob is revoked when selection changes. */}
              <img src={preview} alt={n.imagePreview} />
            </>
          )}
          <button
            type="button"
            className="chat-icon-button"
            aria-label={n.removeAttachment}
            disabled={pending}
            onClick={() => {
              setFile(null);
              setSticker(null);
            }}
          >
            <X size={16} />
          </button>
          <small>{sticker ? n.stickerSelected : n.imageReady}</small>
        </div>
      )}
      {!sticker && !file && (
        <label className="composer-label">
          <span className="sr-only">{n.message}</span>
          <textarea
            name="body"
            placeholder={n.messagePlaceholder}
            maxLength={2000}
            value={body}
            rows={2}
            required
            disabled={pending}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (body.trim() && !pending) formRef.current?.requestSubmit();
              }
            }}
          />
        </label>
      )}
      <div className="composer-toolbar">
        <div>
          <button
            type="button"
            className="chat-icon-button"
            aria-label={n.stickers}
            title={n.stickers}
            aria-expanded={picker}
            aria-controls="chat-sticker-picker"
            disabled={!mediaEnabled || pending}
            onClick={() => {
              setPicker(!picker);
              setFileError("");
            }}
          >
            <Smile size={20} />
          </button>
          <button
            type="button"
            className="chat-icon-button"
            aria-label={n.attachImage}
            title={n.imageLimit}
            disabled={!mediaEnabled || pending}
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={20} />
          </button>
          {demoEnabled && (
            <button
              type="button"
              className="chat-icon-button"
              aria-label={n.demoLaunch}
              title={
                !canPresent
                  ? n.demoPhone
                  : demoLink
                    ? n.demoLaunch
                    : n.demoLaunchHint
              }
              disabled={!canPresent || !demoLink || pending || demoPending}
              onClick={() => void launchDemo()}
            >
              <MonitorPlay size={20} />
            </button>
          )}
          <input
            ref={input}
            type="file"
            hidden
            className="sr-only"
            tabIndex={-1}
            accept={IMAGE_TYPES.join(",")}
            disabled={!mediaEnabled || pending}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              e.target.value = "";
              if (!selected) return;
              if (selected.size > MAX_IMAGE_INPUT) {
                setFileError(n.imageTooLarge);
                return;
              }
              if (!selected.size || !IMAGE_TYPES.includes(selected.type)) {
                setFileError(n.invalidImage);
                return;
              }
              setFile(selected);
              setSticker(null);
              setPicker(false);
              setFileError("");
            }}
          />
        </div>
        <small>{file || sticker ? n.attachmentSendHint : n.enterToSend}</small>
        <button
          className="chat-send-button"
          aria-label={pending ? n.pending : n.send}
          disabled={pending || (!body.trim() && !sticker && !file)}
        >
          {pending ? (
            <LoaderCircle size={19} className="chat-spinner" />
          ) : (
            <ArrowUp size={20} />
          )}
        </button>
      </div>
      {picker && (
        <fieldset className="sticker-picker" id="chat-sticker-picker">
          <legend>{n.stickers}</legend>
          <div>
            {stickerIds.map((id) => (
              <button
                type="button"
                key={id}
                aria-label={n[`sticker${id}`]}
                onClick={() => {
                  setSticker(id);
                  setFile(null);
                  setPicker(false);
                }}
              >
                <ChatSticker id={id} label={n[`sticker${id}`]} />
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {!mediaEnabled && (
        <small className="chat-media-hint">{n.mediaUnavailable}</small>
      )}
      {fileError && (
        <p className="error" role="alert">
          {fileError}
        </p>
      )}
      {result.status === "error" && <ActionStatus result={result} />}
    </form>
  );
}
