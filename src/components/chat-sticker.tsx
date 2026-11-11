import type { StickerId } from "@/lib/chat-media";
const palette = {
  hey: "#d8ed9a",
  hype: "#f2bd88",
  love: "#f2b6cf",
  laugh: "#c6b6ed",
  cozy: "#a9dacf",
  wow: "#efd68f",
  cry: "#a7c9ed",
  gg: "#c4dda0",
};
const words = {
  hey: "HEY!",
  hype: "LET’S GO",
  love: "LOVE",
  laugh: "HAHA",
  cozy: "COZY",
  wow: "WOW!",
  cry: "NOOO",
  gg: "GG",
};
export function ChatSticker({ id, label }: { id: StickerId; label: string }) {
  return (
    <svg
      viewBox="0 0 144 144"
      role="img"
      aria-label={label}
      className="chat-sticker"
    >
      <path
        d="M27 41 22 15Q45 11 54 30Q73 22 91 30Q106 10 123 16L117 45Q138 71 121 104Q105 126 72 122Q32 128 19 98Q7 64 27 41Z"
        fill={palette[id]}
        stroke="#292532"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m29 24 4 20 14-9m65-10-12 11 13 8"
        fill="#292532"
        opacity=".12"
      />
      {id === "love" ? (
        <g fill="#a43d67">
          <path
            d="M42 57q-12-14-17 0-2 8 17 21 20-15 15-23-5-11-15 2Z"
            transform="translate(8 -2) scale(.8)"
          />
          <path
            d="M42 57q-12-14-17 0-2 8 17 21 20-15 15-23-5-11-15 2Z"
            transform="translate(56 -2) scale(.8)"
          />
        </g>
      ) : id === "laugh" || id === "cozy" ? (
        <g fill="none" stroke="#292532" strokeWidth="4" strokeLinecap="round">
          <path d="m39 62 10-5 8 6m29 0 8-6 10 5" />
        </g>
      ) : (
        <g fill="#292532">
          <ellipse cx="49" cy="60" rx="4" ry={id === "wow" ? 9 : 6} />
          <ellipse cx="94" cy="60" rx="4" ry={id === "wow" ? 9 : 6} />
        </g>
      )}
      <ellipse cx="33" cy="77" rx="10" ry="5" fill="#d97e83" opacity=".4" />
      <ellipse cx="109" cy="77" rx="10" ry="5" fill="#d97e83" opacity=".4" />
      {id === "wow" || id === "cry" ? (
        <ellipse cx="72" cy="82" rx="8" ry="11" fill="#292532" />
      ) : (
        <path
          d="M60 78q12 17 25 0"
          fill={id === "laugh" ? "#292532" : "none"}
          stroke="#292532"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {id === "cry" && (
        <g fill="#508ccc">
          <path d="m44 71-5 25q9 7 14 0l-4-25Z" />
          <path d="m90 71-5 25q9 7 14 0l-4-25Z" />
        </g>
      )}
      <rect x="30" y="110" width="84" height="26" rx="13" fill="#292532" />
      <text
        x="72"
        y="128"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize={id === "hype" ? 12 : 14}
        fill={palette[id]}
      >
        {words[id]}
      </text>
    </svg>
  );
}
