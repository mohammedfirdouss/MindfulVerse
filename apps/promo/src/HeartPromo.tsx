// "How is your heart today?": a 9:16 promo for MindfulVerse.
// Story (hook, pain, solution, CTA). The pain plays out at night on a
// restless feed; the question turns the screen to cool cotton daylight.
// Scene lengths vary on purpose (1.5 to 5 s) so the pace never settles.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MARK_RECTS, markBounds } from "../../../packages/core/brand";
import { C, F, bandTile, clothTile, fontCss } from "./brand";

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

/** Scene lengths, in order. Change a number here and the total follows. */
export const SCENES = {
  hook: s(3.2),
  meant: s(1.8),
  aLot: s(2.2),
  scrolled: s(2),
  further: s(2.5),
  question: s(3.6),
  tap: s(1.6),
  verse: s(5),
  orToday: s(1.8),
  tap2: s(1.6),
  verse2: s(4.4),
  oneMinute: s(2.7),
  inside: s(5.6),
  cta: s(6),
};
export const DURATION = Object.values(SCENES).reduce((a, b) => a + b, 0);

const out = Easing.bezier(0.23, 1, 0.32, 1); // strong ease-out
const inOut = Easing.bezier(0.77, 0, 0.175, 1);

/** 0 → 1 between two frames, eased. */
function prog(frame: number, from: number, to: number, ease = out) {
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

/** Fade and rise in from an already-visible offset. */
function rise(frame: number, start: number, dur = 14, dist = 28): CSSProperties {
  const p = prog(frame, start, start + dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)`, filter: `blur(${(1 - p) * 6}px)` };
}

const page: CSSProperties = { padding: "0 96px", justifyContent: "center" };

function Night({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <AbsoluteFill style={{ background: C.night, ...page, ...style }}>{children}</AbsoluteFill>;
}

function Big({ children, color = C.nightInk, size = 92, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.03em", color, textWrap: "balance", ...style }}>
      {children}
    </div>
  );
}

// 1. Hook
function Hook() {
  const f = useCurrentFrame();
  const words = "What if the Qur’an asked how you’re doing first?".split(" ");
  return (
    <Night>
      <Big size={104}>
        {words.map((w, i) => (
          <span key={i} style={{ display: "inline-block", marginRight: "0.24em", ...rise(f, 6 + i * 4, 16, 20), color: i === words.length - 1 ? C.nightIndigo : C.nightInk }}>
            {w}
          </span>
        ))}
      </Big>
    </Night>
  );
}

// 2–5. Pain
function Meant() {
  const f = useCurrentFrame();
  return (
    <Night style={{ justifyContent: "flex-start", paddingTop: 640 }}>
      <Big style={rise(f, 2)}>You meant to read today.</Big>
    </Night>
  );
}

/** Darkens the feed behind a line of text so the text always reads. */
function Scrim({ at }: { at: "center" | "bottom" }) {
  const g = at === "center"
    ? `linear-gradient(to bottom, transparent 30%, ${C.night}ee 44%, ${C.night}ee 56%, transparent 70%)`
    : `linear-gradient(to bottom, transparent 55%, ${C.night}f2 72%, ${C.night})`;
  return <AbsoluteFill style={{ background: g }} />;
}

/** A quiet, abstract feed: grey blocks, nothing readable. */
function Feed({ offset, opacity }: { offset: number; opacity: number }) {
  const cards = Array.from({ length: 14 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ padding: "0 96px", opacity }}>
      <div style={{ transform: `translateY(${-offset}px)`, display: "grid", gap: 36 }}>
        {cards.map((i) => (
          <div key={i} style={{ height: i % 3 === 0 ? 520 : 300, borderRadius: 28, background: C.nightRaised, display: "grid", alignContent: "end", gap: 18, padding: 40 }}>
            <div style={{ height: 22, width: `${50 + ((i * 17) % 40)}%`, borderRadius: 11, background: "#2a2e40" }} />
            <div style={{ height: 22, width: `${30 + ((i * 29) % 30)}%`, borderRadius: 11, background: "#2a2e40" }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function ALot() {
  const f = useCurrentFrame();
  const p = prog(f, 0, SCENES.aLot, inOut);
  return (
    <Night>
      <Feed offset={p * 300} opacity={0.55 * prog(f, 0, 12)} />
      <Scrim at="center" />
      <Big style={{ ...rise(f, 4), position: "relative", textShadow: `0 0 60px ${C.night}` }}>But it felt like a lot.</Big>
    </Night>
  );
}

function Scrolled() {
  const f = useCurrentFrame();
  // A flick: fast, then slowing.
  const p = prog(f, 0, SCENES.scrolled, Easing.bezier(0.1, 0.8, 0.2, 1));
  return (
    <Night style={{ justifyContent: "flex-end", paddingBottom: 300 }}>
      <Feed offset={300 + p * 2600} opacity={0.55} />
      <Scrim at="bottom" />
      <Big style={{ ...rise(f, 6), position: "relative", textShadow: `0 0 60px ${C.night}, 0 0 30px ${C.night}` }}>So you scrolled instead.</Big>
    </Night>
  );
}

function Further() {
  const f = useCurrentFrame();
  const away = prog(f, 10, SCENES.further, inOut);
  return (
    <Night>
      <Big style={{ ...rise(f, 2), transform: `scale(${1 - away * 0.32})`, opacity: 1 - away * 0.6, transformOrigin: "left center" }}>
        And felt a little further away.
      </Big>
    </Night>
  );
}

// 6–7. The question, then a tap
const FEELINGS = ["Anxious", "Grateful", "Grieving", "Hopeful", "Overwhelmed", "Lonely", "Weary", "Afraid"];

function Daylight({ children, wipe = 1 }: { children: ReactNode; wipe?: number }) {
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ background: C.cotton, clipPath: `inset(0 0 ${(1 - wipe) * 100}% 0)` }}>
        <div style={{ height: 30, background: bandTile(C.indigo, C.cotton), backgroundRepeat: "repeat-x" }} />
        <AbsoluteFill style={{ ...page, top: 30 }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Chips({ frame, start, picked, pickProgress = 0 }: { frame: number; start: number; picked?: string; pickProgress?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 64 }}>
      {FEELINGS.map((label, i) => {
        const on = label === picked;
        const dim = picked && !on ? 1 - pickProgress * 0.55 : 1;
        const press = on ? 1 - Math.sin(Math.min(pickProgress, 1) * Math.PI) * 0.06 : 1;
        return (
          <div
            key={label}
            style={{
              ...rise(frame, start + i * 2, 12, 18),
              opacity: (rise(frame, start + i * 2, 12, 18).opacity as number) * dim,
              transform: `${rise(frame, start + i * 2, 12, 18).transform} scale(${press})`,
              padding: "26px 42px",
              borderRadius: 999,
              fontFamily: F.ui,
              fontWeight: 500,
              fontSize: 44,
              border: `2px solid ${on && pickProgress > 0.3 ? C.indigo : C.line}`,
              background: on && pickProgress > 0.3 ? C.indigo : C.raised,
              color: on && pickProgress > 0.3 ? C.cotton : C.inkSoft,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function Question() {
  const f = useCurrentFrame();
  const wipe = prog(f, 0, 18, inOut);
  return (
    <Daylight wipe={wipe}>
      <Big color={C.indigoDeep} size={108} style={rise(f, 14, 16)}>How is your heart today?</Big>
      <Chips frame={f} start={30} />
    </Daylight>
  );
}

/** Where each chip's centre sits in the 1080x1920 frame (measured from renders). */
const CHIP_AT: Record<string, [number, number]> = { Weary: [204, 1272], Anxious: [216, 1004] };

function Tap({ feeling }: { feeling: string }) {
  const f = useCurrentFrame();
  const press = prog(f, 10, 28, Easing.linear);
  // A soft touch mark arrives over the chosen feeling.
  const touch = prog(f, 0, 14);
  const [cx, cy] = CHIP_AT[feeling];
  return (
    <Daylight>
      <Big color={C.indigoDeep} size={108}>How is your heart today?</Big>
      <div style={{ position: "relative" }}>
        <Chips frame={f + 100} start={0} picked={feeling} pickProgress={press} />
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - 60,
          top: cy - 60 - 30,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: C.indigo,
          opacity: touch * 0.16 * (1 - prog(f, 26, 44)),
          transform: `scale(${0.6 + touch * 0.5})`,
        }}
      />
    </Daylight>
  );
}

// 8. A verse on indigo cloth (the app's own text for that feeling)
const VERSES = {
  weary: { ar: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ", en: "Your Lord did not abandon you, nor did He forget.", ref: "Ad-Duha 93:3" },
  anxious: { ar: "إِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرٗا", en: "With hardship comes ease.", ref: "Ash-Sharh 94:6" },
};

function Verse({ verse }: { verse: keyof typeof VERSES }) {
  const f = useCurrentFrame();
  const v = VERSES[verse];
  const up = prog(f, 0, 22);
  return (
    <Daylight>
      <div
        style={{
          transform: `translateY(${(1 - up) * 260}px)`,
          opacity: up,
          borderRadius: 40,
          padding: "96px 80px",
          background: `${clothTile(C.cotton)}, ${C.indigoDeep}`,
          display: "grid",
          gap: 56,
        }}
      >
        <div lang="ar" dir="rtl" style={{ ...rise(f, 16, 22, 30), fontFamily: F.arabic, fontSize: 92, lineHeight: 1.9, whiteSpace: "nowrap", color: C.cotton, textAlign: "right" }}>
          {v.ar}
        </div>
        <div style={{ ...rise(f, 40, 20), fontFamily: F.text, fontSize: 62, lineHeight: 1.4, color: C.cotton, textWrap: "balance" }}>{v.en}</div>
        <div style={{ ...rise(f, 58, 16), fontFamily: F.ui, fontWeight: 500, fontSize: 38, color: "#d6d9ea" }}>{v.ref}</div>
      </div>
    </Daylight>
  );
}

/** A beat between the two feelings. */
function OrToday() {
  const f = useCurrentFrame();
  return (
    <Daylight>
      <Big color={C.indigoDeep} size={104} style={rise(f, 2)}>Or maybe today feels different.</Big>
    </Daylight>
  );
}

// 9.
function OneMinute() {
  const f = useCurrentFrame();
  const lines = [
    { t: "One verse.", at: 2 },
    { t: "One minute.", at: 16 },
    { t: "Just for where you are.", at: 34 },
  ];
  return (
    <Daylight>
      <div style={{ display: "grid", gap: 18 }}>
        {lines.map(({ t, at }, i) => (
          <Big key={t} color={i === 2 ? C.indigo : C.indigoDeep} size={i === 2 ? 96 : 120} style={rise(f, at, 16)}>
            {t}
          </Big>
        ))}
      </div>
    </Daylight>
  );
}

// 10. What else is inside, three short lines with the app's own icons.
function Inside() {
  const f = useCurrentFrame();
  const rows = [
    { t: "Read the whole Qur’an, with commentary.", at: 4, icon: "M5.6 11.2C12 9.2 18.4 10 24 13.6c5.6-3.6 12-4.4 18.4-2.4v26c-6.4-2-12.8-1.2-18.4 2.4-5.6-3.6-12-4.4-18.4-2.4ZM24 13.6v26" },
    { t: "Ponder one verse, one question at a time.", at: 46, icon: "M24 17l7 7-7 7-7-7ZM24 8.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" },
    { t: "Keep what stays with you, privately.", at: 92, icon: "M12 34.4l2-7.6 17.8-17.8a3.8 3.8 0 0 1 5.4 5.4L19.4 32.2ZM7 41h34" },
  ];
  return (
    <Daylight>
      <div style={{ display: "grid", gap: 72 }}>
        {rows.map((r) => (
          <div key={r.t} style={{ display: "flex", gap: 40, alignItems: "center", ...rise(f, r.at, 16) }}>
            <svg width="96" height="96" viewBox="0 0 48 48" style={{ flex: "none" }}>
              <path d={r.icon} fill="none" stroke={C.indigo} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 64, lineHeight: 1.15, letterSpacing: "-0.02em", color: C.indigoDeep }}>{r.t}</div>
          </div>
        ))}
      </div>
    </Daylight>
  );
}

// 11. CTA: the تدبر mark builds square by square, then the name.
function Mark({ frame, size }: { frame: number; size: number }) {
  const b = markBounds();
  const span = Math.max(b.width, b.height);
  const box = span / (1 - 2 * 0.2);
  const ox = b.minX - (box - b.width) / 2;
  const oy = b.minY - (box - b.height) / 2;
  const tile = prog(frame, 0, 16);
  return (
    <svg width={size} height={size} viewBox={`${ox} ${oy} ${box} ${box}`} style={{ transform: `scale(${0.92 + tile * 0.08})`, opacity: tile }}>
      <rect x={ox} y={oy} width={box} height={box} rx={box * 0.22} fill={C.indigo} />
      {MARK_RECTS.map(([x, y, w, h], i) => {
        const p = prog(frame, 10 + i * 2.5, 22 + i * 2.5);
        const cx = x + w / 2;
        const cy = y + h / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={C.cotton}
            opacity={p}
            transform={`translate(${cx} ${cy}) scale(${0.4 + p * 0.6}) translate(${-cx} ${-cy})`}
          />
        );
      })}
    </svg>
  );
}

function Cta() {
  const f = useCurrentFrame();
  return (
    <Daylight>
      <div style={{ display: "grid", justifyItems: "start", gap: 48 }}>
        <Mark frame={f} size={300} />
        <Big color={C.indigoDeep} size={112} style={rise(f, 40, 16)}>MindfulVerse</Big>
        <div style={{ display: "grid", gap: 14, ...rise(f, 54, 16) }}>
          <div style={{ fontFamily: F.text, fontSize: 60, color: C.ink }}>Find your verse today.</div>
          <div style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 40, color: C.inkFaint }}>Free, no sign-up</div>
        </div>
        <div style={{ ...rise(f, 70, 16), fontFamily: F.ui, fontWeight: 500, fontSize: 44, color: C.indigo, marginTop: 24 }}>mindfulverse.vercel.app</div>
      </div>
      <div style={{ position: "absolute", left: 96, right: 96, bottom: 110, ...rise(f, 90, 16, 0), fontFamily: F.ui, fontWeight: 500, fontSize: 28, color: C.inkFaint }}>
        Nasheed: “Alhamdulillah” by Jawad Syed, CC BY 3.0
      </div>
    </Daylight>
  );
}

export function HeartPromo() {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ width, height, background: C.night }}>
      <style>{fontCss}</style>
      {/* Vocals-only nasheed, CC BY 3.0 (public/audio/CREDITS.md): fade in, settle under the
          story, and fade out over the last two seconds. */}
      <Audio
        src={staticFile("audio/alhamdulillah-jawad-syed.m4a")}
        volume={(f) =>
          interpolate(f, [0, 24, DURATION - 60, DURATION], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        }
      />
      <Series>
        <Series.Sequence durationInFrames={SCENES.hook}><Hook /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.meant}><Meant /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.aLot}><ALot /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.scrolled}><Scrolled /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.further}><Further /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.question}><Question /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.tap}><Tap feeling="Weary" /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.verse}><Verse verse="weary" /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.orToday}><OrToday /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.tap2}><Tap feeling="Anxious" /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.verse2}><Verse verse="anxious" /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.oneMinute}><OneMinute /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.inside}><Inside /></Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.cta}><Cta /></Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
