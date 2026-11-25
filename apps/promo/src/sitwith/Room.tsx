// The evening room the story starts in: a deep indigo wall, an arched window
// with a few stars, a lantern's warm pool of light and a prayer rug. Calm on
// purpose, so the phone's light is what draws the eye.
import { AbsoluteFill } from "remotion";

import { C, clothTile } from "../brand";

export function Room({ t, lantern = 1 }: { t: number; lantern?: number }) {
  const flicker = 0.92 + Math.sin(t / 7) * 0.04 + Math.sin(t / 3.1) * 0.02;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #0e1230 0%, ${C.indigoDeep} 55%, #151b44 100%)`,
      }}
    >
      {/* Adire cloth texture on the wall, barely there. */}
      <AbsoluteFill
        style={{ backgroundImage: clothTile(C.nightIndigo, 0.05, 120) }}
      />

      {/* Arched window. */}
      <svg
        style={{ left: 300, position: "absolute", top: 300 }}
        width="480"
        height="640"
        viewBox="0 0 480 640"
      >
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1d2a6e" />
            <stop offset="1" stopColor="#3b4a9a" />
          </linearGradient>
        </defs>
        <path
          d="M20 640 V240 C20 110 120 20 240 20 C360 20 460 110 460 240 V640Z"
          fill="#0b0e26"
        />
        <path
          d="M44 640 V246 C44 128 132 46 240 46 C348 46 436 128 436 246 V640Z"
          fill="url(#sky)"
        />
        {[
          [120, 170, 3],
          [300, 120, 2.4],
          [360, 260, 2],
          [180, 300, 1.8],
          [250, 210, 2.6],
        ].map(([cx, cy, r], i) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="#e8eaf2"
            opacity={0.55 + 0.45 * Math.abs(Math.sin(t / 20 + i))}
          />
        ))}
        {/* A crescent, low in the sky. */}
        <path
          d="M330 150 a34 34 0 1 0 22 60 a26 26 0 1 1 -22 -60Z"
          fill="#f3e6c4"
          opacity="0.9"
        />
        <path d="M240 46 V640 M44 400 H436" stroke="#0b0e26" strokeWidth="10" />
      </svg>

      {/* The lantern's warm pool of light. */}
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(243,214,150,0.38) 0%, rgba(243,214,150,0) 65%)",
          height: 900,
          left: 560,
          opacity: lantern * flicker,
          position: "absolute",
          top: 760,
          width: 900,
        }}
      />
      <svg
        style={{ left: 900, position: "absolute", top: 1060 }}
        width="120"
        height="200"
        viewBox="0 0 120 200"
      >
        <path d="M60 0 V30" stroke="#c9a66b" strokeWidth="4" />
        <path d="M30 40 H90 L80 60 H40Z" fill="#c9a66b" />
        <path
          d="M36 60 H84 L92 150 H28Z"
          fill="#f3d696"
          opacity={0.75 * flicker * lantern}
        />
        <path
          d="M36 60 H84 L92 150 H28Z"
          fill="none"
          stroke="#c9a66b"
          strokeWidth="5"
        />
        <path d="M24 150 H96 L88 168 H32Z" fill="#c9a66b" />
      </svg>

      {/* Floor and prayer rug. */}
      <div
        style={{
          background: "linear-gradient(180deg, #0f1336 0%, #0a0d24 100%)",
          height: 520,
          left: 0,
          position: "absolute",
          right: 0,
          top: 1400,
        }}
      />
      <svg
        style={{ left: 190, position: "absolute", top: 1440 }}
        width="700"
        height="300"
        viewBox="0 0 700 300"
      >
        <path d="M80 0 H620 L700 300 H0Z" fill="#7a2f2a" />
        <path
          d="M110 18 H590 L660 282 H40Z"
          fill="none"
          stroke="#e3c98f"
          strokeWidth="6"
          opacity="0.7"
        />
        <path
          d="M150 44 H550 L610 256 H90Z"
          fill="none"
          stroke="#e3c98f"
          strokeWidth="3"
          strokeDasharray="4 10"
          opacity="0.6"
        />
      </svg>
    </AbsoluteFill>
  );
}
