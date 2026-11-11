"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowUpRight, Plus } from "lucide-react";
import { inspectSource } from "@/lib/providers";
import { createRoomSchema, type RoomInput } from "@/lib/rooms";
import { useWorkspace } from "./workspace-provider";
import {
  RoomCreationHeading,
  RoomCreationPreview,
  RoomFormatPicker,
  RoomVisibilityPicker,
  MusicRoomGuide,
} from "./room-creation-design";
import { FandomPicker } from "./fandom-picker";

export function CreateRoom({
  initialFandom = "",
  initialFormat = "video",
}: {
  initialFandom?: string;
  initialFormat?: "music" | "video";
}) {
  const { t, addRoom, ready } = useWorkspace();
  const router = useRouter();
  const [limit, setLimit] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RoomInput>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      fandomId: initialFandom,
      name: "",
      description: "",
      url: "",
      format: initialFormat,
      visibility: "public",
    },
  });
  const fandomId = useWatch({ control, name: "fandomId" });
  const visibility = useWatch({ control, name: "visibility" });
  const format = useWatch({ control, name: "format" });
  const name = useWatch({ control, name: "name" });
  const description = useWatch({ control, name: "description" });
  const url = useWatch({ control, name: "url" });
  const source = url ? inspectSource(url) : null;
  function submit(data: RoomInput) {
    const id = crypto.randomUUID();
    if (
      !addRoom({
        ...data,
        id,
        kind: "local",
        art: data.format === "music" ? "wave" : "orbit",
        createdAt: new Date().toISOString(),
      })
    ) {
      setLimit(true);
      return;
    }
    router.push(`/room/${id}`);
  }
  return (
    <div className="form-page room-studio-page">
      <Link href="/rooms" className="text-link">
        <ArrowLeft size={17} />
        {t.back}
      </Link>
      <RoomCreationHeading title={t.newRoomTitle} />
      <div className="create-layout">
        <form onSubmit={handleSubmit(submit)} className="form-card" noValidate>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <RoomFormatPicker
                value={field.value}
                onChange={field.onChange}
                local
              />
            )}
          />
          <label htmlFor="room-name">{t.name}</label>
          <input
            id="room-name"
            {...register("name")}
            placeholder={t.roomNamePlaceholder}
            maxLength={80}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="error" role="alert">
              {t.requiredName}
            </p>
          )}
          <label htmlFor="room-description">
            {t.description} <small>({t.optional})</small>
          </label>
          <textarea
            id="room-description"
            {...register("description")}
            placeholder={t.roomDescriptionPlaceholder}
            maxLength={500}
            rows={3}
            aria-invalid={!!errors.description}
          />
          {errors.description && (
            <p className="error" role="alert">
              {t.longDescription}
            </p>
          )}
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <RoomVisibilityPicker
                local
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="fandomId"
            control={control}
            render={({ field }) => (
              <FandomPicker
                value={field.value || ""}
                onChange={field.onChange}
                invalid={!!errors.fandomId}
              />
            )}
          />
          <label htmlFor="room-url">
            {format === "music" ? t.roomStudio.musicSource : t.linkLabel}{" "}
            <small>({t.optional})</small>
          </label>
          <input
            id="room-url"
            {...register("url")}
            placeholder="https://…"
            aria-invalid={!!errors.url}
            aria-describedby={errors.url ? "url-error" : undefined}
          />
          {errors.url && (
            <p id="url-error" className="error" role="alert">
              {t.invalidUrl}
            </p>
          )}
          {source && (
            <div className="notice">
              <LinkIcon />
              {source.provider.name} · {t.companion}
            </div>
          )}
          {format !== "music" && (
            <p className="form-hint">{t.player.sourceHint}</p>
          )}
          {format === "music" && <MusicRoomGuide local />}
          <button
            disabled={!ready || isSubmitting}
            className="button button-primary"
            type="submit"
          >
            <Plus size={18} />
            {t.saveDraft}
          </button>
          {limit && <p role="alert">{t.draftLimit}</p>}
        </form>
        <RoomCreationPreview
          name={name}
          description={description}
          format={format}
          visibility={visibility}
          fandomId={fandomId}
          local
        />
      </div>
    </div>
  );
}
function LinkIcon() {
  return <ArrowUpRight size={17} />;
}
