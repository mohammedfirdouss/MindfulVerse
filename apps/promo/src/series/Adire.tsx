// "Adire" — the logo's story in pattern. 1080x1080, 22 s, 30 fps.
//
// Storyboard (frames @30):
//   0-45     plain indigo cloth
//   45-250   adire resist motifs (diamonds, ringed dots; clothTile) bloom in
//            as if wax lifted from dyed cloth, from three origins, slowly
//   250-370  the pattern tightens; 11 diamonds fly in and become the 11
//            squares of the تدبر mark (MARK_RECTS); the rest fade
//   370-440  "تدبر"  (the word the mark spells; packages/core/brand.ts)
//   430-505  "Tadabbur: deep reflection on the Qur’an."  (brand.ts comment)
//   495-575  "The adire language: dye-resist diamonds on indigo cloth."
//            (Adire.tsx / index.css comments); faint cloth returns
//   565-660  end card: Mark, "MindfulVerse", URL, adire band (+ music credit)
import { AbsoluteFill, Audio, useCurrentFrame } from "remotion";

import { MARK_RECTS, markBounds } from "../../../../packages/core/brand";
import { C, F, clothTile } from "../brand";
import {
  Band,
  Fonts,
  NASHEED,
  NASHEED_CREDIT,
  beat,
  ease,
  prog,
  rise,
} from "../kit";

export const ADIRE_DURATION = 660;
export const meta = {
  durationInFrames: ADIRE_DURATION,
  height: 1080,
  id: "Adire",
  width: 1080,
};

const W = 1080;
const CELL = 120;
const N = 9;
const U = 34; // mark grid unit in px
const MARK_CY = 330;

const b = markBounds();
const mx = W / 2 - (b.minX + b.width / 2) * U;
const my = MARK_CY - (b.minY + b.height / 2) * U;

interface Motif {
  cx: number;
  cy: number;
  delay: number;
  kind: "diamond" | "dot";
  target: number; // index into MARK_RECTS or -1
}

const ORIGINS = [
  [200, 300],
  [860, 520],
  [440, 900],
];

function build(): Motif[] {
  const list: Motif[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cx = i * CELL + CELL / 2;
      const cy = j * CELL + CELL / 2;
      const d = Math.min(
        ...ORIGINS.map(([ox, oy]) => Math.hypot(cx - ox, cy - oy))
      );
      list.push({
        cx,
        cy,
        delay: d * 0.2 + ((i * 7 + j * 13) % 9),
        kind: "diamond",
        target: -1,
      });
    }
  }
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const cx = i * CELL;
      const cy = j * CELL;
      const d = Math.min(
        ...ORIGINS.map(([ox, oy]) => Math.hypot(cx - ox, cy - oy))
      );
      list.push({
        cx,
        cy,
        delay: d * 0.2 + 6 + ((i * 5 + j * 11) % 9),
        kind: "dot",
        target: -1,
      });
    }
  }
  // Choose 11 diamonds near the middle, matched to mark squares by position.
  const diamonds = list
    .filter((m) => m.kind === "diamond")
    .sort(
      (p, q) =>
        Math.hypot(p.cx - 540, p.cy - 540) - Math.hypot(q.cx - 540, q.cy - 540)
    )
    .slice(0, 11);
  const rects = MARK_RECTS.map((r, i) => ({
    i,
    x: mx + (r[0] + r[2] / 2) * U,
    y: my + (r[1] + r[3] / 2) * U,
  }));
  const bySpot = (a: { x: number; y: number }, c: { x: number; y: number }) =>
    a.x - c.x || a.y - c.y;
  const dS = diamonds.map((m) => ({ m, x: m.cx, y: m.cy })).sort(bySpot);
  const rS = [...rects].sort(bySpot);
  for (const [k, d] of dS.entries()) {
    d.m.target = rS[k].i;
  }
  return list;
}
const MOTIFS = build();

function Pattern({ f }: { f: number }) {
  const tight = prog(f, 250, 340, ease.inOut);
  const s = 1 - tight * 0.3;
  const fade = 1 - prog(f, 290, 350);
  const back = prog(f, 495, 540) * 0.5;
  const wax = (f - 45) * 9;
  const mask = ORIGINS.map(
    ([x, y]) =>
      `radial-gradient(circle at ${x}px ${y}px, #000 ${Math.max(0, wax)}px, transparent ${Math.max(0, wax) + 160}px)`
  ).join(",");
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: clothTile(C.cotton, 0.42, 88),
          maskImage: mask,
          opacity: Math.max(fade, back),
          WebkitMaskImage: mask,
        }}
      />
      <svg height={W} style={{ position: "absolute" }} width={W}>
        {MOTIFS.map((m, k) => {
          const p = prog(f, 45 + m.delay, 45 + m.delay + 46);
          if (m.target < 0 && p === 0) {
            return null;
          }
          const px = W / 2 + (m.cx - W / 2) * s;
          const py = W / 2 + (m.cy - W / 2) * s;
          if (m.kind === "dot") {
            const r = 11 * p * s;
            return (
              <g
                key={k}
                opacity={fade * 0.9}
                transform={`translate(${px} ${py})`}
              >
                <circle
                  fill="none"
                  r={r + 5}
                  stroke={C.cotton}
                  strokeWidth={3}
                />
                <circle fill={C.cotton} r={r * 0.4} />
              </g>
            );
          }
          if (m.target < 0) {
            const hd = 40 * p * s;
            return (
              <g
                key={k}
                opacity={fade * 0.95}
                transform={`translate(${px} ${py})`}
              >
                <path
                  d={`M0 ${-hd}L${hd} 0L0 ${hd}L${-hd} 0Z`}
                  fill="none"
                  stroke={C.cotton}
                  strokeWidth={3}
                />
                <path
                  d={`M0 ${-hd * 0.45}L${hd * 0.45} 0L0 ${hd * 0.45}L${-hd * 0.45} 0Z`}
                  fill={C.cotton}
                />
              </g>
            );
          }
          // chosen: becomes a mark square
          const [rx, ry, rw, rh] = MARK_RECTS[m.target];
          const fly = prog(
            f,
            255 + (m.target % 5) * 5,
            345 + (m.target % 5) * 5,
            ease.inOut
          );
          const tx = mx + (rx + rw / 2) * U;
          const ty = my + (ry + rh / 2) * U;
          const x = px + (tx - px) * fly;
          const y = py + (ty - py) * fly;
          const side = 40 * p * s * 1.2;
          const w = side + (rw * U - side) * fly;
          const h = side + (rh * U - side) * fly;
          const rot = 45 * (1 - fly);
          return (
            <g key={k} transform={`translate(${x} ${y}) rotate(${rot})`}>
              <rect
                fill={C.cotton}
                fillOpacity={0.15 + 0.85 * fly}
                height={h}
                stroke={C.cotton}
                strokeWidth={3}
                width={w}
                x={-w / 2}
                y={-h / 2}
              />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

const LINE = {
  color: C.cotton,
  fontFamily: F.ui,
  fontSize: 76,
  fontWeight: 600,
  letterSpacing: "-0.03em",
  lineHeight: 1.12,
  textAlign: "center" as const,
  textWrap: "balance" as const,
};

function Slot({
  children,
  style,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        left: 90,
        position: "absolute",
        right: 90,
        top: 640,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Adire({ withNasheed }: { withNasheed: boolean }) {
  const f = useCurrentFrame();
  const endIn = 565;
  return (
    <AbsoluteFill style={{ background: C.indigo }}>
      <Fonts />
      {withNasheed ? (
        <Audio
          src={NASHEED}
          volume={(g) =>
            Math.min(
              prog(g, 0, 24, (t) => t) * 0.8,
              0.8 * (1 - prog(g, ADIRE_DURATION - 60, ADIRE_DURATION, (t) => t))
            )
          }
        />
      ) : null}
      <Pattern f={f} />
      <Slot style={{ ...beat(f, 372, 440), height: 260 }}>
        <div
          style={{
            color: C.cotton,
            direction: "rtl",
            fontFamily: F.arabic,
            fontSize: 190,
            lineHeight: 1.9,
          }}
        >
          تدبر
        </div>
      </Slot>
      <Slot style={{ ...beat(f, 432, 505), height: 260 }}>
        <div style={LINE}>Tadabbur: deep reflection on the Qur’an.</div>
      </Slot>
      <Slot style={{ ...beat(f, 497, 575), height: 260 }}>
        <div style={LINE}>
          The adire language: dye-resist diamonds on indigo cloth.
        </div>
      </Slot>
      <Slot
        style={{
          ...rise(f, endIn + 6, 16),
          flexDirection: "column",
          gap: 22,
          height: 300,
        }}
      >
        <div style={{ ...LINE, fontSize: 104 }}>MindfulVerse</div>
        <div
          style={{
            color: C.nightIndigo,
            fontFamily: F.ui,
            fontSize: 46,
            fontWeight: 600,
          }}
        >
          mindfulverse.vercel.app
        </div>
      </Slot>
      {f >= endIn - 10 ? <Band h={44} start={endIn + 4} top={W - 44} /> : null}
      {withNasheed ? (
        <div
          style={{
            ...rise(f, endIn + 24, 14, 10),
            bottom: 76,
            color: C.nightIndigo,
            fontFamily: F.ui,
            fontSize: 28,
            fontWeight: 500,
            left: 0,
            position: "absolute",
            right: 0,
            textAlign: "center",
          }}
        >
          {NASHEED_CREDIT}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
