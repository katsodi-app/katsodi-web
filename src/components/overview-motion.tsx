"use client";
import { useEffect } from "react";
import { useLocale } from "./workspace-provider";

/** Progressive enhancement: content stays visible without JS or motion. */
export function OverviewMotion() {
  const { locale } = useLocale();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".overview-standalone");
    if (!root || !window.IntersectionObserver) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        if (preference.matches) return;
        for (const [index, entry] of entries.entries())
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            const animation = entry.target.animate(
              [
                { opacity: 0, translate: "0 22px" },
                { opacity: 1, translate: "0 0" },
              ],
              {
                duration: 700,
                delay: Math.min(index, 5) * 65,
                easing: "cubic-bezier(.2,.7,.2,1)",
              },
            );
            animations.add(animation);
            animation.finished
              .then(() => animations.delete(animation))
              .catch(() => {});
          }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    const collect = () =>
      root
        .querySelectorAll(
          "h1,h2,h3,p,.overview-actions,.overview-mode-tabs,.overview-room-preview,.overview-video-frame,.overview-map-branch,.overview-map-lines,.overview-map-center,.overview-steps > li,.overview-footer nav li,.overview-footer-search,.overview-desktop-links a,.overview-access-art > span,.overview-brand,.overview-topbar-actions,.overview-annotation-art",
        )
        .forEach((element) => {
          if (!seen.has(element)) {
            seen.add(element);
            observer.observe(element);
          }
        });
    collect();
    const mutations = new MutationObserver(collect);
    mutations.observe(root, { childList: true, subtree: true });
    const hero = root.querySelector<HTMLElement>(".overview-hero");
    const tiles = root.querySelector<HTMLElement>(".overview-constellation");
    let parallax: Animation | null = null;
    const move = (event: PointerEvent) => {
      if (
        !tiles ||
        !hero ||
        preference.matches ||
        event.pointerType !== "mouse"
      )
        return;
      const box = hero.getBoundingClientRect();
      // Keep React-owned attributes untouched, even if this shell hydrates
      // before the streamed page. WAAPI never inserts a style attribute.
      const from = getComputedStyle(tiles).translate;
      parallax?.cancel();
      parallax = tiles.animate(
        [
          { translate: from },
          {
            translate: `${(event.clientX - box.left - box.width / 2) * 0.012}px ${(event.clientY - box.top - box.height / 2) * 0.012}px`,
          },
        ],
        { duration: 800, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
      );
    };
    const reset = () => {
      parallax?.cancel();
      parallax = null;
    };
    const reduce = () => {
      if (preference.matches) {
        animations.forEach((animation) => animation.cancel());
        reset();
      }
    };
    hero?.addEventListener("pointermove", move);
    hero?.addEventListener("pointerleave", reset);
    preference.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach((animation) => animation.cancel());
      hero?.removeEventListener("pointermove", move);
      hero?.removeEventListener("pointerleave", reset);
      preference.removeEventListener("change", reduce);
      reset();
    };
  }, [locale]);
  return null;
}
