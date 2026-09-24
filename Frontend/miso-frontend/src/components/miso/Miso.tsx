import { useId } from "react";

/**
 * Miso — an original marmalade tabby drawn in a colored-pencil sketchbook style.
 * Crayon texture comes from two static hatch patterns layered per shape (no SVG
 * filters), so it stays cheap to animate next to the face model.
 */
export type MisoMood =
  | "neutral" | "happy" | "sad" | "angry" | "fearful" | "disgusted"
  | "surprised" | "contempt" | "sleepy" | "sparkle" | "listening";

export interface MisoProps {
  mood?: MisoMood;
  size?: number;
  variant?: "full" | "head";
  animated?: boolean;
  className?: string;
  /** Hide from assistive tech when a visible label already says who this is. */
  decorative?: boolean;
}

const INK = "#3a2e29";
const TONES = {
  fur:   { base: "#f8d9a6", a: "#eea24a", b: "#d9822e" },
  pink:  { base: "#fbe3e3", a: "#f2a0a8", b: "#e7848f" },
  eye:   { base: "#e6f3c9", a: "#bddf8e", b: "#a3cf72" },
  cream: { base: "#fffdf8", a: "#f1e6d6", b: "#e8dccb" },
} as const;
type Tone = keyof typeof TONES;

const LABELS: Record<MisoMood, string> = {
  neutral: "calm", happy: "happy", sad: "sad", angry: "grumpy",
  fearful: "nervous", disgusted: "unimpressed", surprised: "surprised",
  contempt: "side-eyeing you", sleepy: "sleepy", sparkle: "delighted",
  listening: "listening",
};

// Shapes (viewBox 0 0 240 240). Right-side parts mirror the left at x = 240 - x.
const P = {
  tail: "M168,196 C205,196 222,165 214,128 C211,112 200,100 206,90 C215,97 227,112 229,133 C232,172 208,211 170,209 Z",
  body: "M76,144 C60,170 58,200 68,214 C90,224 150,224 172,214 C182,198 180,168 164,144 Z",
  belly: "M100,176 C98,196 104,212 120,214 C136,212 142,196 140,176 C132,166 108,166 100,176 Z",
  earL: "M62,78 C59,56 63,37 70,25 C84,33 96,43 104,50 Z",
  earR: "M178,78 C181,56 177,37 170,25 C156,33 144,43 136,50 Z",
  innerL: "M71,64 C70,52 72,42 75,36 C82,41 88,46 93,52 Z",
  innerR: "M169,64 C170,52 168,42 165,36 C158,41 152,46 147,52 Z",
  head: "M52,101 C49,64 82,44 120,44 C158,44 191,64 188,101 C188,135 158,151 120,151 C82,151 52,135 52,101 Z",
  muzzle: "M97,124 C97,111 108,107 120,108 C132,107 143,111 143,124 C143,136 132,141 120,140 C108,141 97,136 97,124 Z",
  pawL: "M86,214 C86,204 94,200 102,200 C111,200 116,206 115,214 C112,219 90,219 86,214 Z",
  pawR: "M154,214 C154,204 146,200 138,200 C129,200 124,206 125,214 C128,219 150,219 154,214 Z",
  star: "M0,-11 Q2,-2 11,0 Q2,2 0,11 Q-2,2 -11,0 Q-2,-2 0,-11 Z",
};

const MOUTH: Record<MisoMood, string> = {
  neutral: "M110,122 Q115,128 120,122 Q125,128 130,122",
  happy: "M106,121 Q113,131 120,122 Q127,131 134,121",
  sad: "M111,131 Q120,123 129,131",
  angry: "M111,129 L116,126 L120,129 L124,126 L129,129",
  fearful: "M108,129 q3,-3 6,0 q3,3 6,0 q3,-3 6,0 q3,3 6,0",
  disgusted: "M111,128 Q117,124 129,130",
  surprised: "",
  contempt: "M112,127 Q123,129 129,121",
  sleepy: "M113,122 Q116.5,126 120,122 Q123.5,126 127,122",
  sparkle: "",
  listening: "M112,122 Q116,127 120,122 Q124,127 128,122",
};

// Pupil offset from eye centre, and pupil radii.
const GAZE: Partial<Record<MisoMood, [number, number]>> = {
  listening: [4, -6], contempt: [9, 3], disgusted: [-8, 3], sad: [0, 3],
};
const PUPIL: Partial<Record<MisoMood, [number, number]>> = {
  fearful: [4, 5.5], surprised: [5.5, 6.5], sad: [11, 14],
};
// Eyelid edge as [outer y, inner y] in eye-local coords; area above it is covered.
const LID: Partial<Record<MisoMood, [number, number]>> = {
  angry: [-16, -2], sad: [-2, -15], disgusted: [-4, -4], contempt: [-2, -2],
};
const BLINKS: MisoMood[] = ["neutral", "sad", "fearful", "surprised", "listening", "angry"];

export default function Miso({
  mood = "neutral", size = 160, variant = "full", animated = true, className, decorative = false,
}: MisoProps) {
  const id = useId().replace(/:/g, "");
  const u = (t: Tone, n: 1 | 2) => `url(#${id}-${t}${n})`;

  const Crayon = ({ d, tone, ink = true }: { d: string; tone: Tone; ink?: boolean }) => (
    <g>
      <path d={d} fill={u(tone, 1)} />
      <path d={d} fill={u(tone, 2)} />
      {ink && <Ink d={d} />}
    </g>
  );

  const eye = (cx: number, side: -1 | 1) => {
    const cy = 94;
    const ref = `${id}-eye${side}`;
    if (mood === "happy")
      return <path d={`M${cx - 14},${cy + 5} Q${cx},${cy - 13} ${cx + 14},${cy + 5}`} {...line(3.2)} />;
    if (mood === "sleepy")
      return <path d={`M${cx - 14},${cy} Q${cx},${cy + 9} ${cx + 14},${cy}`} {...line(3)} />;
    if (mood === "sparkle")
      return (
        <g>
          <circle cx={cx} cy={cy} r={21} fill="#2a211d" />
          <path d={P.star} transform={`translate(${cx} ${cy}) scale(1.45)`} fill="#f6d64a" stroke="#e0b52c" strokeWidth={0.8} />
          <Ink d={circle(cx, cy, 21)} />
        </g>
      );

    const [gx, gy] = GAZE[mood] ?? [0, 1];
    const [rx, ry] = PUPIL[mood] ?? [9.5, 13];
    const lid = LID[mood];
    // Mirror: the "inner" side faces the nose.
    const [yL, yR] = lid ? (side === -1 ? lid : [lid[1], lid[0]]) : [0, 0];
    return (
      <g className={animated && BLINKS.includes(mood) ? "miso-blink" : undefined}>
        <clipPath id={ref}><circle cx={cx} cy={cy} r={22} /></clipPath>
        <circle cx={cx} cy={cy} r={22} fill={u("eye", 1)} />
        <circle cx={cx} cy={cy} r={22} fill={u("eye", 2)} />
        <g clipPath={`url(#${ref})`}>
          <ellipse cx={cx + gx} cy={cy + gy} rx={rx} ry={ry} fill="#231c19" />
          <circle cx={cx + gx - rx * 0.45} cy={cy + gy - ry * 0.45} r={mood === "sad" ? 4.2 : 3.3} fill="#fff" />
          <circle cx={cx + gx + rx * 0.4} cy={cy + gy + ry * 0.4} r={1.6} fill="#fff" />
          {lid && (
            <>
              <path d={`M${cx - 26},${cy - 26} L${cx + 26},${cy - 26} L${cx + 26},${cy + yR} L${cx - 26},${cy + yL} Z`} fill={u("fur", 1)} />
              <path d={`M${cx - 26},${cy + yL} L${cx + 26},${cy + yR}`} {...line(2.6)} />
            </>
          )}
        </g>
        <Ink d={circle(cx, cy, 22)} />
      </g>
    );
  };

  const brows =
    mood === "angry" ? ["M72,64 L100,72", "M168,64 L140,72"] :
    mood === "sad" || mood === "fearful" ? ["M74,70 L98,62", "M166,70 L142,62"] : [];

  const viewBox = variant === "head" ? "40 16 160 142" : "0 0 240 240";

  return (
    <svg
      viewBox={viewBox} width={size} height={size} {...(decorative ? { "aria-hidden": true, focusable: false } : { role: "img", "aria-label": `Miso the cat, ${LABELS[mood]}` })}
      className={["miso", className].filter(Boolean).join(" ")}
    >
      <defs>
        {(Object.keys(TONES) as Tone[]).map((t) => (
          <g key={t}>
            <pattern id={`${id}-${t}1`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
              <rect width={5} height={5} fill={TONES[t].base} />
              <path d="M0,1 H5 M0,3.7 H5" stroke={TONES[t].a} strokeWidth={1.6} opacity={0.85} />
            </pattern>
            <pattern id={`${id}-${t}2`} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
              <path d="M0,2 H7 M0,5.5 H4.5" stroke={TONES[t].b} strokeWidth={1.1} opacity={0.5} />
            </pattern>
          </g>
        ))}
      </defs>
      <style>{CSS}</style>

      {variant === "full" && (
        <>
          <g className={animated ? "miso-tail" : undefined}>
            <Crayon d={P.tail} tone="fur" />
            <path d="M216,120 l9,-3 M220,146 l9,1 M214,172 l9,4" {...stripe} />
          </g>
          <g className={animated ? "miso-breathe" : undefined}>
            <Crayon d={P.body} tone="fur" />
            <path d="M74,172 l12,3 M72,190 l12,1 M166,172 l-12,3 M168,190 l-12,1" {...stripe} />
            <Crayon d={P.belly} tone="cream" />
          </g>
          <Crayon d={P.pawL} tone="cream" />
          <Crayon d={P.pawR} tone="cream" />
          <path d="M96,207 v6 M104,207 v6 M136,207 v6 M144,207 v6" {...line(1.4)} />
        </>
      )}

      <g transform={mood === "listening" ? "rotate(-5 120 150)" : undefined}>
      <g className={animated ? "miso-head" : undefined}>
        <Crayon d={P.earL} tone="fur" />
        <Crayon d={P.earR} tone="fur" />
        <Crayon d={P.innerL} tone="pink" ink={false} />
        <Crayon d={P.innerR} tone="pink" ink={false} />
        <Crayon d={P.head} tone="fur" />
        <path d="M111,51 l2,13 M120,48 v15 M129,51 l-2,13 M55,96 l12,2 M56,107 l11,0 M185,96 l-12,2 M184,107 l-11,0" {...stripe} />
        <Crayon d={P.muzzle} tone="cream" />

        <ellipse cx={70} cy={122} rx={mood === "happy" || mood === "sparkle" ? 11 : 8.5} ry={5} fill={u("pink", 1)} opacity={0.9} />
        <ellipse cx={170} cy={122} rx={mood === "happy" || mood === "sparkle" ? 11 : 8.5} ry={5} fill={u("pink", 1)} opacity={0.9} />

        {eye(88, -1)}
        {eye(152, 1)}
        {brows.map((d) => <path key={d} d={d} {...line(3)} />)}

        <path d="M114.5,114 L125.5,114 L120,120.5 Z" fill="#f2a0a8" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
        {MOUTH[mood] && <path d={MOUTH[mood]} {...line(2)} />}
        {mood === "surprised" && <ellipse cx={120} cy={129} rx={4.5} ry={6} fill="#e7848f" stroke={INK} strokeWidth={1.8} />}
        {mood === "sparkle" && <path d="M110,122 Q120,141 130,122 Z" fill="#f2a0a8" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />}

        <path d="M62,120 l-24,-5 M62,126 l-24,2 M178,120 l24,-5 M178,126 l24,2" {...line(1.1)} />

        {mood === "sad" && <path d="M78,118 q-4,7 0,10 q4,-3 0,-10 Z" fill="#bfe0f2" stroke="#7fb1cc" strokeWidth={1} />}
        {mood === "fearful" && <path d="M184,62 q-5,8 0,11 q5,-3 0,-11 Z" fill="#bfe0f2" stroke="#7fb1cc" strokeWidth={1} />}
        {mood === "sleepy" && <text x={176} y={46} fontSize={16} fontFamily="'Zen Maru Gothic', sans-serif" fill={INK}>z<tspan dx={2} dy={-8} fontSize={11}>z</tspan></text>}
        {mood === "sparkle" && (
          <g fill="#f6d64a" stroke="#e0b52c" strokeWidth={0.8}>
            <path d={P.star} transform="translate(46 50) scale(.6)" />
            <path d={P.star} transform="translate(196 58) scale(.45)" />
          </g>
        )}
      </g>
      </g>
    </svg>
  );
}

const Ink = ({ d }: { d: string }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={INK} strokeWidth={2.2} />
    <path d={d} stroke={INK} strokeWidth={1} opacity={0.3} transform="translate(0.9 0.7)" />
  </g>
);

const line = (w: number) => ({
  fill: "none", stroke: INK, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
const stripe = { fill: "none", stroke: "#c9691f", strokeWidth: 3.6, strokeLinecap: "round" as const, opacity: 0.85 };
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;

const CSS = `
.miso .miso-breathe{transform-origin:120px 216px;animation:miso-breathe 3.6s ease-in-out infinite}
.miso .miso-head{transform-origin:120px 150px;animation:miso-bob 3.6s ease-in-out infinite}
.miso .miso-tail{transform-origin:172px 204px;animation:miso-tail 4.2s ease-in-out infinite}
.miso .miso-blink{transform-box:fill-box;transform-origin:center;animation:miso-blink 5.5s infinite}
@keyframes miso-breathe{50%{transform:scale(1.012,1.022)}}
@keyframes miso-bob{50%{transform:translateY(1.5px)}}
@keyframes miso-tail{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
@keyframes miso-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}
@media (prefers-reduced-motion:reduce){.miso *{animation:none!important}}
`;
