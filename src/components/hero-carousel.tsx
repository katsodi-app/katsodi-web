"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { IntentLink as Link } from "./intent-link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { fandomAssets, slides } from "@/data/editorial";
import { fandoms } from "@/lib/fandoms";
import { EditorialImage } from "./editorial-image";
import { useLocale } from "./workspace-provider";
export function HeroCarousel() {
  const { locale, t } = useLocale();
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[index];
  const artwork = fandoms
    .filter((f) => f.category === slide.category)
    .slice(0, 8);
  const move = (direction: number) =>
    setIndex((i) => (i + direction + slides.length) % slides.length);
  function keydown(event: KeyboardEvent) {
    if (
      (event.target as HTMLElement).closest(
        "input,textarea,select,[contenteditable=true]",
      )
    )
      return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  }
  return (
    <section
      className="editorial-hero constellation-hero"
      aria-roledescription={t.carousel}
      aria-label={t.editorial}
      tabIndex={0}
      onKeyDown={keydown}
      onTouchStart={(event) => {
        start.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }}
      onTouchEnd={(event) => {
        const point = start.current;
        start.current = null;
        if (!point) return;
        const x = event.changedTouches[0].clientX - point.x;
        const y = event.changedTouches[0].clientY - point.y;
        if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.5)
          move(x < 0 ? 1 : -1);
      }}
    >
      <div className="hero-orbit" key={slide.id}>
        {artwork.map((fandom, position) => (
          <Link
            href={`/fandoms/${fandom.id}`}
            aria-label={fandom.name}
            className={`orbit-card orbit-${position}`}
            key={fandom.id}
          >
            <EditorialImage
              asset={fandomAssets[fandom.id]}
              priority={[0, 1, 4, 5].includes(position)}
              sizes="(max-width: 600px) 24vw, 170px"
            />
            <span>{fandom.name}</span>
          </Link>
        ))}
      </div>
      <div
        className="hero-editorial-content"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="hero-copy" key={slide.id}>
          <div className="editorial-kicker">
            <span>{t.editorial}</span>
            <span>{t[slide.category]}</span>
          </div>
          <h2>{slide.title[locale]}</h2>
          <p>{slide.body[locale]}</p>
          <Link className="button button-primary" href={slide.href}>
            {slide.cta[locale]}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <div className="hero-bottom">
        <div className="hero-pagination">
          <span className="slide-number">
            {String(index + 1).padStart(2, "0")}
            <small> / {String(slides.length).padStart(2, "0")}</small>
          </span>
          <div className="slide-dots">
            {slides.map((item, i) => (
              <button
                key={item.id}
                aria-label={`${t.slide} ${i + 1}: ${item.title[locale].replace("\n", " ")}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
        <div className="hero-arrows">
          <button onClick={() => move(-1)} aria-label={t.previousSlide}>
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => move(1)} aria-label={t.nextSlide}>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
