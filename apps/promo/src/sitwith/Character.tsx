// The MindfulVerse character: an original, faceless man in a kaftan and kufi,
// drawn as soft-shaded SVG so he sits in the same world as the app's indigo
// and adire. Faceless on purpose. Two poses: sitting cross-legged with a phone
// (alone, or in a circle), and standing (the two friends after salah).
import { useId } from "react";

export interface Look {
  /** Kaftan colour. */
  robe: string;
  /** A darker shade of the robe, for folds and the shadow side. */
  robeShade: string;
  /** Kufi colour. */
  cap: string;
  /** Skin tone. */
  skin: string;
  /** Embroidery along the neckline, cuffs and cap. */
  trim: string;
}

export const LOOKS: Record<string, Look> = {
  cotton: {
    cap: "#f4f1ea",
    robe: "#eef0f5",
    robeShade: "#c9cedc",
    skin: "#7a4b2e",
    trim: "#2a3a8c",
  },
  earth: {
    cap: "#f4f1ea",
    robe: "#a8774f",
    robeShade: "#7c5537",
    skin: "#6b4026",
    trim: "#f4f1ea",
  },
  indigo: {
    cap: "#f4f1ea",
    robe: "#2a3a8c",
    robeShade: "#1b2559",
    skin: "#8a5a3c",
    trim: "#e3c98f",
  },
  sage: {
    cap: "#1b2559",
    robe: "#7d8f7a",
    robeShade: "#5a6b58",
    skin: "#5c3820",
    trim: "#f4f1ea",
  },
};

interface Props {
  look: Look;
  pose?: "sit" | "stand";
  /** Where the base of the figure sits on the canvas, and its size. */
  x: number;
  y: number;
  scale?: number;
  /** 0 to 1: how brightly the phone lights him. 0 hides the phone. */
  glow?: number;
  /** Head tilt in degrees; positive looks down at the phone. */
  tilt?: number;
  /** Frame, for a slow breath. */
  t?: number;
  /** Mirror him, to face the other way. */
  flip?: boolean;
}

export function Character({
  look,
  pose = "sit",
  x,
  y,
  scale = 1,
  glow = 1,
  tilt = 8,
  t = 0,
  flip = false,
}: Props) {
  const id = useId().replaceAll(":", "");
  const breath = Math.sin(t / 28) * 3;
  const sit = pose === "sit";
  // Shoulders and head ride the breath; the base stays put.
  const top = sit ? -430 : -720;
  const headY = top - 92 + breath;
  return (
    <svg
      style={{
        left: x - 300 * scale,
        overflow: "visible",
        position: "absolute",
        top: y - 760 * scale,
      }}
      width={600 * scale}
      height={800 * scale}
      viewBox="-300 -760 600 800"
    >
      <defs>
        <linearGradient id={`robe-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={look.robeShade} />
          <stop offset="0.45" stopColor={look.robe} />
          <stop offset="1" stopColor={look.robeShade} />
        </linearGradient>
        <radialGradient id={`head-${id}`} cx="0.42" cy="0.6" r="0.8">
          <stop offset="0" stopColor={look.skin} />
          <stop offset="0.7" stopColor={look.skin} />
          <stop offset="1" stopColor="#0b0e26" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#dfe6ff" stopOpacity={0.42 * glow} />
          <stop offset="1" stopColor="#dfe6ff" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <g transform={flip ? "scale(-1,1)" : undefined}>
        {/* Contact shadow on the floor. */}
        <ellipse
          cx="0"
          cy="6"
          rx={sit ? 250 : 120}
          ry={sit ? 34 : 18}
          fill="#000"
          opacity="0.28"
          filter={`url(#soft-${id})`}
        />

        {sit ? (
          <>
            {/* Crossed legs under the kaftan. */}
            <path
              d="M-240 -10 C-250 -80 -150 -120 0 -118 C150 -120 250 -80 240 -10 C200 18 -200 18 -240 -10Z"
              fill={look.robeShade}
            />
            {/* The kaftan's body. */}
            <path
              d={`M-118 ${top + breath} C-160 ${top + 40} -205 -200 -205 -90 C-205 -70 205 -70 205 -90 C205 -200 160 ${top + 40} 118 ${top + breath} C80 ${top - 30 + breath} -80 ${top - 30 + breath} -118 ${top + breath}Z`}
              fill={`url(#robe-${id})`}
            />
          </>
        ) : (
          <path
            d={`M-112 ${top + breath} C-150 ${top + 60} -165 -200 -150 -8 C-90 4 90 4 150 -8 C165 -200 150 ${top + 60} 112 ${top + breath} C76 ${top - 28 + breath} -76 ${top - 28 + breath} -112 ${top + breath}Z`}
            fill={`url(#robe-${id})`}
          />
        )}

        {/* Folds in the kaftan: soft creases that catch the light. */}
        <g
          fill="none"
          stroke={look.robeShade}
          strokeLinecap="round"
          strokeWidth="5"
          opacity="0.55"
        >
          {sit ? (
            <>
              <path d={`M-150 ${top + 170} C-170 -250 -175 -170 -160 -96`} />
              <path d={`M150 ${top + 170} C170 -250 175 -170 160 -96`} />
              <path d="M-40 -112 C-60 -80 -95 -50 -150 -34" />
              <path d="M40 -112 C60 -80 95 -50 150 -34" />
              <path d="M0 -108 C-4 -80 -2 -50 6 -22" />
            </>
          ) : (
            <>
              <path d={`M-70 ${top + 210} C-82 -400 -96 -200 -104 -16`} />
              <path d={`M70 ${top + 210} C82 -400 96 -200 104 -16`} />
              <path d={`M0 ${top + 300} C-6 -300 6 -150 0 -12`} />
            </>
          )}
        </g>
        <g
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="3"
          opacity="0.12"
        >
          {sit ? (
            <path d={`M-130 ${top + 160} C-148 -260 -150 -180 -138 -100`} />
          ) : (
            <path d={`M-52 ${top + 220} C-62 -400 -74 -200 -82 -20`} />
          )}
        </g>

        {/* Embroidered neckline. */}
        <path
          d={`M-46 ${top - 4 + breath} L0 ${top + 70 + breath} L46 ${top - 4 + breath}`}
          fill="none"
          stroke={look.trim}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M0 ${top + 70 + breath} V${top + 150 + breath}`}
          stroke={look.trim}
          strokeWidth="6"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />

        {/* Arms: full sleeves bending in to hold the phone at the chest. */}
        {[-1, 1].map((side) => {
          const handY = sit ? -244 : top + 288;
          const sx = side * 118;
          const sy = top + 30 + breath;
          return (
            <g key={side}>
              <path
                d={`M${sx} ${sy} C${side * 196} ${sy + 80} ${side * 200} ${handY - 40} ${side * 120} ${handY + 6} L${side * 52} ${handY + 22} C${side * 40} ${handY - 4} ${side * 70} ${handY - 26} ${side * 104} ${handY - 34} C${side * 138} ${handY - 70} ${side * 130} ${sy + 110} ${side * 70} ${sy + 40}Z`}
                fill={look.robe}
                stroke={look.robeShade}
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <ellipse
                cx={side * 40}
                cy={handY + 10}
                rx="22"
                ry="19"
                fill={look.skin}
              />
            </g>
          );
        })}

        {glow > 0 ? (
          <>
            {/* The phone, its screen lighting the hands and chest. */}
            <ellipse
              cx="0"
              cy={sit ? -300 : top + 230}
              rx="105"
              ry="130"
              fill={`url(#glow-${id})`}
            />
            <rect
              x="-30"
              y={sit ? -296 : top + 236}
              width="60"
              height="104"
              rx="10"
              fill="#12141d"
              transform={`rotate(-14 0 ${sit ? -244 : top + 288})`}
            />
            <rect
              x="-25"
              y={sit ? -291 : top + 241}
              width="50"
              height="94"
              rx="7"
              fill="#dfe6ff"
              opacity={0.35 + 0.65 * glow}
              transform={`rotate(-14 0 ${sit ? -244 : top + 288})`}
            />
          </>
        ) : null}

        {/* Neck, head and kufi; no face, on purpose. */}
        <g transform={`rotate(${tilt} 0 ${headY + 60})`}>
          <rect
            x="-26"
            y={headY + 40}
            width="52"
            height="48"
            rx="18"
            fill={look.skin}
          />
          <ellipse
            cx="0"
            cy={headY}
            rx="64"
            ry="76"
            fill={`url(#head-${id})`}
          />
          <path
            d={`M-66 ${headY - 26} C-64 ${headY - 92} 64 ${headY - 92} 66 ${headY - 26} C30 ${headY - 34} -30 ${headY - 34} -66 ${headY - 26}Z`}
            fill={look.cap}
          />
          <path
            d={`M-62 ${headY - 34} C-28 ${headY - 42} 28 ${headY - 42} 62 ${headY - 34}`}
            fill="none"
            stroke={look.trim}
            strokeWidth="7"
            strokeDasharray="10 8"
            opacity="0.85"
          />
        </g>
      </g>
    </svg>
  );
}
