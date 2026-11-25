// The masjid, outside at dusk and inside the prayer hall, in the same indigo
// world as the evening room. Original shapes: a dome, one minaret, arched
// windows lit from within, and an adire band along the wall.
import { AbsoluteFill } from "remotion";

import { C, clothTile } from "../brand";

/** Outside, at dusk: the dome and minaret against the sky, windows glowing. */
export function MasjidOutside({ t, dim = 0 }: { t: number; dim?: number }) {
  const glow = 0.85 + Math.sin(t / 9) * 0.05;
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #141a46 0%, #2a3a8c 45%, #6b5a8e 72%, #c98f6b 100%)",
      }}
    >
      {[
        [140, 220],
        [860, 160],
        [700, 330],
        [300, 120],
        [980, 420],
      ].map(([x, y], i) => (
        <div
          key={`${x}-${y}`}
          style={{
            background: "#e8eaf2",
            borderRadius: 4,
            height: 5,
            left: x,
            opacity: 0.4 + 0.5 * Math.abs(Math.sin(t / 18 + i)),
            position: "absolute",
            top: y,
            width: 5,
          }}
        />
      ))}
      <svg
        style={{ bottom: 0, left: 0, position: "absolute" }}
        width="1080"
        height="1300"
        viewBox="0 0 1080 1300"
      >
        {/* Minaret. */}
        <path d="M820 1300 V420 H900 V1300Z" fill="#141a3f" />
        <path d="M800 420 H920 V380 H800Z" fill="#1b2559" />
        <path
          d="M818 380 C818 300 860 250 860 210 C860 250 902 300 902 380Z"
          fill="#141a3f"
        />
        <path d="M860 210 V160" stroke="#e3c98f" strokeWidth="6" />
        <path
          d="M852 150 a14 14 0 1 0 16 0 a10 10 0 1 1 -16 0Z"
          fill="#e3c98f"
        />
        {/* Dome and hall. */}
        <path d="M180 1300 V760 H760 V1300Z" fill="#161c48" />
        <path d="M250 760 C250 520 690 520 690 760Z" fill="#1b2559" />
        <path d="M470 560 V500" stroke="#e3c98f" strokeWidth="6" />
        <path
          d="M462 492 a14 14 0 1 0 16 0 a10 10 0 1 1 -16 0Z"
          fill="#e3c98f"
        />
        {/* Lit arched windows. */}
        {[260, 400, 540].map((x) => (
          <path
            key={x}
            d={`M${x} 1100 V930 C${x} 880 ${x + 100} 880 ${x + 100} 930 V1100Z`}
            fill="#f3d696"
            opacity={glow}
          />
        ))}
        {/* Door. */}
        <path
          d="M400 1300 V1180 C400 1130 540 1130 540 1180 V1300Z"
          fill="#f3d696"
          opacity={glow * 0.9}
        />
      </svg>
      <AbsoluteFill style={{ background: "#0a0d24", opacity: dim }} />
    </AbsoluteFill>
  );
}

/** Inside the prayer hall: arches, the mihrab, lanterns, an adire band and
 *  a carpet with prayer rows. */
export function MasjidInside({ t }: { t: number }) {
  const flicker = 0.9 + Math.sin(t / 6) * 0.05;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #121738 0%, ${C.indigoDeep} 60%, #0d1130 100%)`,
      }}
    >
      <AbsoluteFill
        style={{ backgroundImage: clothTile(C.nightIndigo, 0.05, 120) }}
      />
      <svg
        style={{ left: 0, position: "absolute", top: 0 }}
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
      >
        {/* Arches along the back wall. */}
        {[40, 400, 760].map((x) => (
          <path
            key={x}
            d={`M${x} 1100 V560 C${x} 420 ${x + 280} 420 ${x + 280} 560 V1100Z`}
            fill="#0e1235"
            stroke="#24306f"
            strokeWidth="10"
          />
        ))}
        {/* The mihrab, softly lit. */}
        <path
          d="M440 1100 V640 C440 540 640 540 640 640 V1100Z"
          fill="#2a3a8c"
          opacity="0.8"
        />
        <path
          d="M470 1100 V660 C470 590 610 590 610 660 V1100Z"
          fill="#f3d696"
          opacity={0.18 * flicker}
        />
        {/* Adire band. */}
        <rect x="0" y="1100" width="1080" height="34" fill="#1b2559" />
        {Array.from({ length: 27 }, (_, i) => (
          <path
            key={i}
            d={`M${i * 40 + 20} 1104 l13 13 l-13 13 l-13 -13Z`}
            fill="#e3c98f"
            opacity="0.55"
          />
        ))}
        {/* Lanterns. */}
        {[200, 880].map((x) => (
          <g key={x}>
            <path d={`M${x} 0 V300`} stroke="#c9a66b" strokeWidth="3" />
            <path
              d={`M${x - 26} 300 H${x + 26} L${x + 34} 380 H${x - 34}Z`}
              fill="#f3d696"
              opacity={0.8 * flicker}
            />
            <circle
              cx={x}
              cy={340}
              r="160"
              fill="#f3d696"
              opacity={0.07 * flicker}
            />
          </g>
        ))}
        {/* Carpet with prayer rows. */}
        <path d="M0 1134 H1080 V1920 H0Z" fill="#5a2422" />
        {[1240, 1400, 1580, 1780].map((y) => (
          <path
            key={y}
            d={`M0 ${y} H1080`}
            stroke="#e3c98f"
            strokeWidth="4"
            opacity="0.28"
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
}
