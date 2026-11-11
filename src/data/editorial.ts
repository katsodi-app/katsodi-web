import provenance from "../../public/images/editorial/provenance.json";
import posters from "./fandom-posters.json";
import curated from "./curated-posters.json";
import { fandoms, type Category } from "@/lib/fandoms";
import type { Locale } from "@/lib/i18n";
type Localized = Record<Locale, string>;
export type AssetId =
  | "concert"
  | "coast"
  | "library"
  | "space"
  | "court"
  | "tokyo"
  | "vinyl"
  | "dunes"
  | "forest"
  | "cinema";
export type EditorialAsset = {
  id: string;
  src: string;
  alt: Localized;
  focalPoint: string;
  glow: string;
  background?: string;
  width: number;
  height: number;
  source: string;
  author: string;
  license: string;
  licenseUrl: string;
  kind: "thematic-photograph" | "fandom-artwork";
  /** 480px-wide variant (scripts/prepare-fandom-thumbnails.mjs). */
  thumbnail?: string;
};
const art: Record<
  AssetId,
  { alt: Localized; focalPoint: string; glow: string }
> = {
  dunes: {
    alt: {
      ru: "Золотые дюны Намибии и редкие деревья на песчаной равнине",
      en: "Golden Namibian dunes and sparse trees on a sandy plain",
    },
    focalPoint: "65% 48%",
    glow: "#b77d49",
  },
  forest: {
    alt: {
      ru: "Бирюзовое озеро Морейн среди хвойного леса и гор",
      en: "Turquoise Moraine Lake surrounded by pine forest and mountains",
    },
    focalPoint: "60% 50%",
    glow: "#507f76",
  },
  coast: {
    alt: {
      ru: "Белые ворота тории у моря в Японии",
      en: "A white torii gate on the Japanese coast",
    },
    focalPoint: "50% 55%",
    glow: "#7b9bb0",
  },
  tokyo: {
    alt: {
      ru: "Ночные огни Токио отражаются на мокрой улице",
      en: "Tokyo night lights reflected on a wet street",
    },
    focalPoint: "50% 45%",
    glow: "#6a6098",
  },
  concert: {
    alt: {
      ru: "Силуэты зрителей и свет над концертной сценой",
      en: "Audience silhouettes and lights above a concert stage",
    },
    focalPoint: "65% 40%",
    glow: "#b07a50",
  },
  vinyl: {
    alt: {
      ru: "Виниловая пластинка на проигрывателе в мягком свете",
      en: "A vinyl record on a turntable in soft light",
    },
    focalPoint: "50% 60%",
    glow: "#69947c",
  },
  library: {
    alt: {
      ru: "Ряды книг на полках библиотеки в Торонто",
      en: "Rows of books on shelves in a Toronto library",
    },
    focalPoint: "50% 42%",
    glow: "#a88351",
  },
  space: {
    alt: {
      ru: "Спиральная галактика среди звёзд на тёмном небе",
      en: "A spiral galaxy among stars in a dark sky",
    },
    focalPoint: "50% 50%",
    glow: "#656c9d",
  },
  court: {
    alt: {
      ru: "Синяя баскетбольная площадка с белой разметкой",
      en: "A blue basketball court with white line markings",
    },
    focalPoint: "50% 40%",
    glow: "#5e87a0",
  },
  cinema: {
    alt: {
      ru: "Неоновая вывеска кинотеатра ночью",
      en: "A cinema neon sign at night",
    },
    focalPoint: "50% 45%",
    glow: "#9d5468",
  },
};
export const assets = Object.fromEntries(
  Object.entries(art).map(([id, properties]) => {
    const original = provenance.find((p) => p.id === id)!;
    return [
      id,
      {
        id,
        ...properties,
        src: `/images/editorial/${id}-1600.webp`,
        width: original.width,
        height: original.height,
        source: original.page,
        author: original.author,
        license: original.license,
        licenseUrl: original.licenseUrl,
        kind: "thematic-photograph",
      },
    ];
  }),
) as Record<AssetId, EditorialAsset>;

export const fandomAssets: Record<
  string,
  EditorialAsset & { fandomId: string; work: string }
> = Object.fromEntries(
  fandoms.map((fandom) => {
    const poster =
      curated.find((p) => p.fandomId === fandom.id) ||
      posters.find((p) => p.fandomId === fandom.id);
    return [
      fandom.id,
      {
        id: fandom.id,
        fandomId: fandom.id,
        kind: "fandom-artwork" as const,
        src: poster?.src || "/images/fandoms/unavailable.webp",
        thumbnail:
          poster && poster.width > 600
            ? poster.src.replace(/\.webp$/, "-480.webp")
            : undefined,
        width: poster?.width || 480,
        height: poster?.height || 700,
        alt: {
          ru: `Обложка или изображение: ${fandom.name}${poster?.title !== fandom.name && poster ? ` — ${poster.title}` : ""}`,
          en: `Cover or image: ${fandom.name}${poster?.title !== fandom.name && poster ? ` — ${poster.title}` : ""}`,
        },
        focalPoint: poster?.focalPoint || "50% 30%",
        glow: "#45403c",
        background: poster?.original.includes(".svg") ? "#eeeeea" : undefined,
        source: poster?.fileSource || "",
        author: poster?.author || "",
        license: poster?.license || "",
        licenseUrl: poster?.licenseUrl || "",
        work: poster?.title || fandom.name,
      },
    ];
  }),
);
export const featuredNames = [
  "Dune",
  "Studio Ghibli",
  "Cyberpunk 2077",
  "BTS",
  "Harry Potter",
  "Basketball",
  "Star Wars",
  "Minecraft",
];
export const featuredFandoms = featuredNames.map((name) =>
  fandoms.find((f) => f.name === name)!,
);
export const categoryDescriptions: Record<Category, Localized> = {
  cinema: {
    ru: "Истории, которые хочется обсудить после титров.",
    en: "Stories worth talking about after the credits.",
  },
  anime: {
    ru: "Любимые миры, новые главы и ещё одна серия.",
    en: "Favourite worlds, new chapters, and one more episode.",
  },
  games: {
    ru: "Большие приключения и свои люди по ту сторону экрана.",
    en: "Great adventures and your people on the other side of the screen.",
  },
  music: {
    ru: "Знакомые мелодии и новые открытия для вашего вечера.",
    en: "Familiar melodies and new discoveries for your evening.",
  },
  books: {
    ru: "Обсуждать любимые страницы лучше вместе.",
    en: "Favourite pages are better when shared.",
  },
  sport: {
    ru: "Общие эмоции, любимые команды и большой момент.",
    en: "Shared emotions, favourite teams, and the big moment.",
  },
};
export type EditorialSlide = {
  id: string;
  asset: AssetId;
  category: Category;
  title: Localized;
  body: Localized;
  cta: Localized;
  href: string;
};
export const slides: EditorialSlide[] = [
  {
    id: "dune",
    asset: "dunes",
    category: "cinema",
    title: {
      ru: "У каждого мира\nесть свои люди.",
      en: "Every world has\nits people.",
    },
    body: {
      ru: "От песков Дюны до далёких галактик. Найди тех, с кем хочется остаться до финальных титров.",
      en: "From the sands of Dune to distant galaxies. Find the people you want beside you through the final credits.",
    },
    cta: { ru: "В мир Дюны", en: "Explore Dune" },
    href: "/fandoms/cinema-6",
  },
  {
    id: "coast",
    asset: "coast",
    category: "anime",
    title: {
      ru: "Ещё одна серия.\nЕщё один мир.",
      en: "One more episode.\nOne more world.",
    },
    body: {
      ru: "Большие приключения и маленькие истории. Выбери свой аниме-фандом — и компанию для следующего вечера.",
      en: "Grand adventures and quiet stories. Find your anime fandom and company for your next evening.",
    },
    cta: { ru: "Открыть аниме", en: "Explore anime" },
    href: "/fandoms?category=anime",
  },
  {
    id: "forest",
    asset: "forest",
    category: "games",
    title: {
      ru: "Побочный квест:\nнайти своих.",
      en: "Side quest:\nfind your people.",
    },
    body: {
      ru: "От уютных ферм до огромных открытых миров. Здесь найдётся место вашему следующему приключению.",
      en: "From cosy farms to vast open worlds. Make room for your next adventure.",
    },
    cta: { ru: "Найти игровой фандом", en: "Find a gaming fandom" },
    href: "/fandoms?category=games",
  },
  {
    id: "concert",
    asset: "concert",
    category: "music",
    title: {
      ru: "На одной волне.\nНа любом расстоянии.",
      en: "Same wavelength.\nAny distance.",
    },
    body: {
      ru: "Песни, к которым возвращаешься. Люди, с которыми хочется ими поделиться.",
      en: "Songs you keep coming back to. People you want to share them with.",
    },
    cta: { ru: "Музыкальные комнаты", en: "Explore music rooms" },
    href: "/rooms?format=music",
  },
  {
    id: "library",
    asset: "library",
    category: "books",
    title: {
      ru: "История не кончается\nна последней странице.",
      en: "The story goes beyond\nthe last page.",
    },
    body: {
      ru: "Теории, любимые герои и книги, которые не отпускают. Продолжим разговор?",
      en: "Theories, favourite characters, and books that stay with you. Keep the conversation going.",
    },
    cta: { ru: "Найти книжный фандом", en: "Explore book fandoms" },
    href: "/fandoms?category=books",
  },
  {
    id: "court",
    asset: "court",
    category: "sport",
    title: {
      ru: "Эмоции сильнее,\nкогда они общие.",
      en: "Big moments.\nBetter together.",
    },
    body: {
      ru: "Для тех, кто помнит каждый решающий бросок. Найди свой спортивный фандом.",
      en: "For those who remember every decisive shot. Find your sports community.",
    },
    cta: { ru: "Спортивные фандомы", en: "Explore sports fandoms" },
    href: "/fandoms?category=sport",
  },
];

/** Poster for a community fandom (approved from a request): a branded placeholder. */
export function communityFandomAsset(fandom: {
  id: string;
  name: string;
}): EditorialAsset {
  return {
    id: fandom.id,
    src: "/images/fandoms/community.webp",
    alt: { ru: fandom.name, en: fandom.name },
    focalPoint: "50% 50%",
    glow: "#3a4a1c",
    width: 480,
    height: 700,
    source: "",
    author: "Katsodi",
    license: "",
    licenseUrl: "",
    kind: "fandom-artwork",
  };
}
/** The poster for any fandom: catalogue artwork, or the community placeholder. */
export const fandomAsset = (fandom: { id: string; name: string }) =>
  fandomAssets[fandom.id] ?? communityFandomAsset(fandom);
