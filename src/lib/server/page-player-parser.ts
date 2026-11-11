import { parse, type DefaultTreeAdapterMap } from "parse5";
import { inspectSource } from "../providers";
type Node = DefaultTreeAdapterMap["node"];
export function pagePlayerSignals(html: string, page: string) {
  const frames: { url: string; priority: number }[] = [];
  const declared: string[] = [];
  const oembed: string[] = [];
  let native = false;
  let playerContainer = false,
    playerScript = false;
  const nodes: Node[] = [parse(html)];
  let count = 0;
  const safeURL = (value: string) => {
    try {
      return inspectSource(new URL(value, page).href)?.url || null;
    } catch {
      return null;
    }
  };
  while (nodes.length && count++ < 30000) {
    const node = nodes.pop()!;
    if (!("tagName" in node)) {
      if ("childNodes" in node) nodes.push(...node.childNodes);
      continue;
    }
    const attrs = Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
    if (/^(?:video[-_]?player|player|player_container)$/i.test(attrs.id || ""))
      playerContainer = true;
    if (node.tagName === "script") {
      const content = node.childNodes
        .flatMap((child) => ("value" in child ? [child.value] : []))
        .join("");
      if (
        /(?:\bjwplayer\s*\(|\bvideojs\s*\(|\bnew\s+Playerjs\s*\()/i.test(
          content,
        ) ||
        /(?:jwplayer|video(?:\.min)?\.js|playerjs)/i.test(attrs.src || "")
      )
        playerScript = true;
      if (attrs.type === "application/ld+json" && content.length <= 32768) {
        try {
          const queue: { value: unknown; depth: number }[] = [
            { value: JSON.parse(content), depth: 0 },
          ];
          let seen = 0;
          while (queue.length && seen++ < 500) {
            const { value, depth } = queue.pop()!;
            if (!value || typeof value !== "object" || depth > 8) continue;
            if (Array.isArray(value)) {
              queue.push(
                ...value.map((item) => ({ value: item, depth: depth + 1 })),
              );
              continue;
            }
            const data = value as Record<string, unknown>;
            if (data["@type"] === "VideoObject") {
              if (typeof data.embedUrl === "string") {
                const src = safeURL(data.embedUrl);
                if (src) {
                  frames.push({ url: src, priority: 2 });
                  declared.push(src);
                }
              }
              if (
                typeof data.contentUrl === "string" &&
                safeURL(data.contentUrl)
              )
                native = true;
            }
            queue.push(
              ...Object.values(data).map((item) => ({
                value: item,
                depth: depth + 1,
              })),
            );
          }
        } catch {
          /* Invalid structured metadata is not executable code. */
        }
      }
    }
    if (node.tagName === "video") native = true;
    // Player containers are evidence for an original-page fallback, not proof of playback.
    if (/(?:^|\s)(?:jwplayer|video-js|plyr)(?:\s|$)/i.test(attrs.class || ""))
      native = true;
    if (node.tagName === "iframe") {
      const src = safeURL(attrs.src || attrs["data-src"] || "");
      if (
        src &&
        ("allowfullscreen" in attrs ||
          /(?:^|;)\s*(?:autoplay|fullscreen)(?:\s|;|$)/i.test(
            attrs.allow || "",
          ))
      )
        declared.push(src);
      if (src && src !== page && (attrs.src || attrs["data-src"]))
        frames.push({
          url: src,
          priority:
            "allowfullscreen" in attrs ||
            /(?:video|player|embed|watch|stream)/i.test(
              [attrs.src, attrs.title, attrs.id, attrs.class, attrs.allow].join(
                " ",
              ),
            )
              ? 1
              : 0,
        });
    }
    if (
      node.tagName === "meta" &&
      ["og:video", "og:video:url", "og:video:secure_url"].includes(
        attrs.property,
      )
    ) {
      const src = safeURL(attrs.content || "");
      if (src) {
        if (/\.(?:mp4|webm|m3u8|mpd)(?:\?|$)/i.test(src)) native = true;
        else {
          frames.push({ url: src, priority: 2 });
          declared.push(src);
        }
      }
    }
    // Twitter/X player card: the site's own declared embeddable player page.
    if (
      node.tagName === "meta" &&
      (attrs.name === "twitter:player" || attrs.property === "twitter:player")
    ) {
      const src = safeURL(attrs.content || "");
      if (src) {
        frames.push({ url: src, priority: 2 });
        declared.push(src);
      }
    }
    // oEmbed discovery: the site's published embedding API for this page.
    if (
      node.tagName === "link" &&
      /(?:^|\s)alternate(?:\s|$)/i.test(attrs.rel || "") &&
      /^application\/json\+oembed$/i.test(attrs.type || "")
    ) {
      const href = safeURL(attrs.href || "");
      if (href) oembed.push(href);
    }
    if (!["script", "style", "template", "noscript"].includes(node.tagName))
      nodes.push(...node.childNodes);
  }
  return {
    frames: [
      ...new Set(
        frames
          .sort((a, b) => b.priority - a.priority)
          .map((frame) => frame.url),
      ),
    ].slice(0, 4),
    native: native || (playerContainer && playerScript),
    declared,
    oembed: [...new Set(oembed)].slice(0, 2),
  };
}

/**
 * Extracts the player iframe from an oEmbed response. Only "video" and "rich"
 * types with an <iframe> in their html field count; the html is parsed as an
 * inert AST and never rendered or executed.
 */
export function oembedPlayer(json: string, endpoint: string): string | null {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (
      !data ||
      typeof data !== "object" ||
      !["video", "rich"].includes(String(data.type)) ||
      typeof data.html !== "string" ||
      data.html.length > 16384
    )
      return null;
    const frames = pagePlayerSignals(data.html, endpoint).frames;
    return frames[0] || null;
  } catch {
    return null;
  }
}
