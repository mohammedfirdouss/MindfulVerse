// Visual tokens mirrored from apps/web/src/index.css (West African indigo:
// adire blues on raw cotton, kola-nut accent). Keep the two in step.
//
// Theme choice mirrors web's lib/theme.ts: user-controlled, stored under the
// same localStorage key, default LIGHT ("the identity is light; night mode is
// an explicit choice"). Native adds a third value, "system", which follows the
// OS; it is opt-in so the default matches web.
import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";

export type Scheme = "light" | "dark";
export type ThemePref = Scheme | "system";

const KEY = "mindfulverse.theme.v1";

export const palettes = {
  light: {
    cotton: "#f5efe2", // ground
    cottonRaised: "#fbf7ec", // lifted surface
    shea: "#e8dcc3", // secondary surface (cards)
    indigo: "#2a3a8c", // the voice of the app: buttons, links, eyebrows
    indigoDeep: "#1b2559", // headings, Arabic
    indigoWash: "#dfe3f2", // pale wash, selected states
    kola: "#c4622d", // rare accent, focus
    ink: "#221d15",
    inkSoft: "#57503f",
    inkFaint: "#8a8168",
    line: "#ddd3bc",
    lineStrong: "#c9bd9f",
  },
  dark: {
    cotton: "#14161f",
    cottonRaised: "#1b1e2a",
    shea: "#232739",
    indigo: "#93a5e4",
    indigoDeep: "#b5c2ef",
    indigoWash: "#262e4d",
    kola: "#dd9059",
    ink: "#e9e4d8",
    inkSoft: "#b3ab99",
    inkFaint: "#7f7869",
    line: "#2b2f42",
    lineStrong: "#3a3f58",
  },
} as const;

export type Colors = { [K in keyof (typeof palettes)["light"]]: string };

/** Font family names registered in app/_layout.tsx (useFonts). Android
 *  can't pick weights inside one custom family, so each weight is a family. */
export const fonts = {
  read: "Fraunces", // 400, Latin UI + translation (web: --font-read)
  readSemiBold: "Fraunces-SemiBold", // 600, headings / buttons
  arabic: "UthmanicHafs", // KFGQPC Uthmanic Hafs (web: --font-arabic)
} as const;

/** Spacing scale in dp, from the web's recurring paddings/gaps. */
export const space = { xs: 4, sm: 8, md: 16, lg: 22, xl: 32, xxl: 40 } as const;
export const radius = { sm: 3, md: 4 } as const;

/** Type scale in dp; web's base is 17px with rem multiples. */
export const type = {
  body: { fontSize: 17, lineHeight: 28 }, // 1.65
  small: { fontSize: 14.5, lineHeight: 22 }, // .85rem eyebrow / meta
  h1: { fontSize: 34, lineHeight: 39 }, // 2.1rem, 1.15
  h2: { fontSize: 24, lineHeight: 28 }, // 1.4rem
  translation: { fontSize: 17.7, lineHeight: 29 }, // 1.04rem
  // 1.9rem at line-height 2.3: tall lines so stacked tashkeel isn't clipped.
  arabic: { fontSize: 32, lineHeight: 74 },
} as const;

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

interface ThemeValue {
  scheme: Scheme;
  pref: ThemePref;
  colors: Colors;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: "light",
  pref: "light",
  colors: palettes.light,
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const os = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>(readThemePref);
  const scheme: Scheme = pref === "system" ? (os === "dark" ? "dark" : "light") : pref;

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* the choice lasts this run */
    }
    setPrefState(p);
  }, []);

  const value = useMemo(
    () => ({ scheme, pref, colors: palettes[scheme], setPref }),
    [scheme, pref, setPref],
  );
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
