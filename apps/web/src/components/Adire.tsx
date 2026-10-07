// The adire language, shared with the mobile app (apps/mobile/src/ui/adire.tsx):
// diamond numerals, the dye-rule, the surah title plate, and the section icons.
// Styles live in index.css under "Adire language".
import type { ReactNode } from "react";
import { arabicSurahName, revelationPlace } from "@mindfulverse/core/surahNames";

/** A numeral in the adire diamond: solid indigo, or an indigo outline. */
export function Diamond({
  n,
  outline = false,
  className = "",
}: {
  n: number | string;
  outline?: boolean;
  className?: string;
}) {
  const small = String(n).length >= 3 ? " small" : "";
  if (!outline) return <span className={`diamond${small} ${className}`} aria-hidden="true">{n}</span>;
  return (
    <span className={`diamond outline${small} ${className}`} aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" focusable="false">
        <path d="M20 1 39 20 20 39 1 20Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span>{n}</span>
    </span>
  );
}

/** Section break: a hairline with a kola diamond at its centre. */
export function DyeRule({ className = "" }: { className?: string }) {
  return (
    <div className={`dye-rule ${className}`} role="presentation">
      <i />
    </div>
  );
}

/** The surah's opening on dyed cloth: Arabic name, English name, details. */
export function TitlePlate({
  surah,
  name,
  ayahCount,
  children,
}: {
  surah: number;
  name?: string;
  ayahCount?: number;
  children?: ReactNode;
}) {
  const arabic = arabicSurahName(surah);
  const details = [`Surah ${surah}`, revelationPlace(surah), ayahCount ? `${ayahCount} verses` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <header className="cloth title-plate fade-rise">
      {arabic ? (
        <div className="plate-arabic" lang="ar" aria-hidden="true">
          {arabic}
        </div>
      ) : null}
      {name ? <h1 className="plate-name">{name}</h1> : null}
      <p className="plate-meta">{details}</p>
      {children}
    </header>
  );
}

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Tadabbur: ripples spreading from a still point. */
export function TadabburIcon() {
  return (
    <Icon>
      <path d="M12 9.6 14.4 12 12 14.4 9.6 12Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5.6" />
      <circle cx="12" cy="12" r="9.4" strokeDasharray="2.2 2.6" />
    </Icon>
  );
}

/** Dhikr: a ring of prayer beads. */
export function DhikrIcon() {
  const beads = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 - Math.PI / 2;
    return [12 + Math.cos(a) * 7.6, 11 + Math.sin(a) * 7.6];
  });
  return (
    <Icon>
      {beads.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.35" fill="currentColor" stroke="none" />
      ))}
      <path d="M12 18.6v4M10.6 22.6h2.8" />
    </Icon>
  );
}

/** Read: an open mushaf. */
export function ReadIcon() {
  return (
    <Icon>
      <path d="M2.8 5.6C6 4.6 9.2 5 12 6.8c2.8-1.8 6-2.2 9.2-1.2v13c-3.2-1-6.4-.6-9.2 1.2-2.8-1.8-6-2.2-9.2-1.2Z" />
      <path d="M12 6.8v13" />
    </Icon>
  );
}

/** A chevron for rows that open somewhere. */
export function ChevronIcon() {
  return (
    <Icon size={18}>
      <path d="M9 5l7 7-7 7" strokeWidth="2" />
    </Icon>
  );
}
