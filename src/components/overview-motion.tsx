"use client";
import { useEffect } from "react";

/**
 * Motion for /overview, as progressive enhancement: without JavaScript or
 * with reduced motion everything is simply visible and still.
 *
 * - [data-reveal] elements rise and fade in once they enter the viewport.
 * - The night-sky photographs drift slower than the page (parallax), and the
 *   hero copy fades as it scrolls away.
 * - The poster line slides sideways with the scroll.
 * - The glass room preview tilts towards the pointer.
 * - The top bar turns solid once the page leaves the hero.
 *
 * Everything moves through the Web Animations API: scroll-linked effects are
 * paused animations whose currentTime follows the scroll. No element
 * attribute changes, so this runs safely while the page is still hydrating.
 * (Only the top bar, rendered together with this component, gets
 * data-scrolled.)
 */
export function OverviewMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".overview-standalone");
    if (!root) return;
    const bar = root.querySelector<HTMLElement>(".ov-topbar");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const cleanups: (() => void)[] = [];

    // Top bar state: also wanted with reduced motion.
    const updateBar = () => {
      if (bar) bar.dataset.scrolled = String(scrollY > 24);
    };
    updateBar();
    addEventListener("scroll", updateBar, { passive: true });
    cleanups.push(() => removeEventListener("scroll", updateBar));
    if (reduce.matches) return () => cleanups.forEach((cleanup) => cleanup());

    // Reveal on enter, staggered within each batch.
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          let order = 0;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            entry.target.animate(
              [
                { opacity: 0, transform: "translateY(28px)", filter: "blur(6px)" },
                { opacity: 1, transform: "none", filter: "blur(0)" },
              ],
              {
                duration: 900,
                delay: Math.min(order++, 6) * 80,
                easing: "cubic-bezier(.16,1,.3,1)",
                fill: "backwards",
              },
            );
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
      root.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
      cleanups.push(() => observer.disconnect());
    }

    // Scroll-linked effects: paused animations scrubbed by the scroll.
    type Scrub = { animation: Animation; progress: () => number };
    const scrubs: Scrub[] = [];
    const scrub = (
      element: Element | null,
      keyframes: Keyframe[],
      progress: (box: DOMRect) => number,
      measure: Element | null = element,
    ) => {
      if (!element || !measure) return;
      const animation = element.animate(keyframes, { duration: 1000, fill: "both" });
      animation.pause();
      scrubs.push({
        animation,
        progress: () => progress(measure.getBoundingClientRect()),
      });
    };
    const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
    const viewport = () => innerHeight;
    // Skies: from entering at the bottom to leaving at the top, drift 30%.
    for (const sky of root.querySelectorAll(".ov-sky"))
      scrub(
        sky,
        [{ transform: "translateY(-12%)" }, { transform: "translateY(12%)" }],
        (box) => clamp((viewport() - box.top) / (viewport() + box.height)),
        sky.parentElement,
      );
    // Hero copy and glass preview fade and lift over the first screen.
    const hero = root.querySelector(".ov-hero");
    const firstScreen = () => clamp(scrollY / viewport());
    scrub(
      root.querySelector(".ov-hero-copy"),
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-70px)" },
      ],
      firstScreen,
      hero,
    );
    scrub(
      root.querySelector(".ov-glass-stage"),
      [{ transform: "none" }, { transform: "translateY(-90px)" }],
      firstScreen,
      hero,
    );
    // Poster line slides a third of its width while it crosses the screen.
    scrub(
      root.querySelector("[data-marquee]"),
      [{ transform: "translateX(0)" }, { transform: "translateX(-33%)" }],
      (box) => clamp((viewport() - box.top) / (viewport() + box.height)),
    );
    let frame = 0;
    const render = () => {
      frame = 0;
      for (const { animation, progress } of scrubs)
        animation.currentTime = progress() * 1000;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    render();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    cleanups.push(() => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      scrubs.forEach(({ animation }) => animation.cancel());
    });

    // Glass preview tilts towards the pointer (mouse and pen only).
    const glass = root.querySelector<HTMLElement>(".ov-glass");
    if (glass && hero) {
      let tilt: Animation | null = null;
      const turn = (transform: string) => {
        const from = getComputedStyle(glass).transform;
        tilt?.cancel();
        tilt = glass.animate(
          [{ transform: from === "none" ? "rotateX(10deg)" : from }, { transform }],
          { duration: 600, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
        );
      };
      const move = (event: Event) => {
        const pointer = event as PointerEvent;
        if (pointer.pointerType === "touch") return;
        const x = pointer.clientX / innerWidth - 0.5;
        const y = pointer.clientY / innerHeight - 0.5;
        turn(`rotateX(${(10 - y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`);
      };
      const leave = () => turn("rotateX(10deg)");
      hero.addEventListener("pointermove", move);
      hero.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        hero.removeEventListener("pointermove", move);
        hero.removeEventListener("pointerleave", leave);
        tilt?.cancel();
      });
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return null;
}
