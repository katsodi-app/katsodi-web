// Pure helpers and types for the Top 150. No chart data here, so client
// components can format a track without bundling all 150 entries.
/** One verified entry of the Top 150 (see scripts/build-music-chart.mjs). */
export type MusicTrack = {
  rank: number;
  slug: string;
  title: string;
  artists: string[];
  released: string | null;
  explicit: boolean;
  streams: number;
  cover: string;
  thumb: string;
  spotifyId: string;
  /** Only set when the track was found on the artist's own SoundCloud account. */
  soundcloud: { url: string; author: string } | null;
  checked: string;
};

/** The fields a pager link needs for the neighbouring tracks. */
export type MusicTrackLink = Pick<MusicTrack, "slug" | "rank" | "title">;

export const spotifyUrl = (id: string) =>
  `https://open.spotify.com/track/${encodeURIComponent(id)}`;
export const spotifyEmbedUrl = (id: string) =>
  `https://open.spotify.com/embed/track/${encodeURIComponent(id)}`;
export const soundcloudWidgetUrl = (url: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&visual=false`;
export const soundcloudSearchUrl = (track: MusicTrack) =>
  `https://soundcloud.com/search/sounds?q=${encodeURIComponent(`${track.artists[0]} ${track.title}`)}`;

type Locale = "ru" | "en";
const streamFormatters = {
  ru: new Intl.NumberFormat("ru", {
    notation: "compact",
    maximumFractionDigits: 2,
  }),
  en: new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }),
};
export function formatStreams(streams: number, locale: Locale) {
  return streamFormatters[locale].format(streams);
}
export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** A factual description built only from the verified data. */
export function musicDescription(track: MusicTrack, locale: Locale) {
  const artists = track.artists.join(", ");
  const streams = formatStreams(track.streams, locale);
  const checked = formatDate(track.checked, locale);
  if (locale === "ru")
    return [
      `«${track.title}» — ${artists}.`,
      track.released
        ? `Релиз на Spotify: ${formatDate(track.released, "ru")}.`
        : "",
      `${streams} прослушиваний на Spotify на ${checked} — ${track.rank}-е место среди самых прослушиваемых песен за всё время.`,
    ]
      .filter(Boolean)
      .join(" ");
  return [
    `“${track.title}” by ${artists}.`,
    track.released
      ? `Released on Spotify on ${formatDate(track.released, "en")}.`
      : "",
    `${streams} Spotify streams as of ${checked}, number ${track.rank} among the most-streamed songs of all time.`,
  ]
    .filter(Boolean)
    .join(" ");
}
