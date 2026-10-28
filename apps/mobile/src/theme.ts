// Visual tokens mirrored from apps/web/src/index.css (West African indigo:
// adire blues on cool undyed cotton, one accent; kola only for errors and
// destructive actions). Keep the two in step.
//
// Theme choice mirrors web's lib/theme.ts: user-controlled, stored under the
// same localStorage key, default LIGHT ("the identity is light; night mode is
// an explicit choice"). Native adds a third value, "system", which follows the
// OS; it is opt-in so the default matches web.
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";

export type Scheme = "light" | "dark";
export type ThemePref = Scheme | "system";

const KEY = "mindfulverse.theme.v1";

export const palettes = {
  dark: {
    cotton: "#12141d",
    cottonRaised: "#191c28",
    indigo: "#93a5e4",
    indigoDeep: "#b5c2ef",
    indigoWash: "#262e4d",
    ink: "#e8eaf2",
    inkFaint: "#8b91a8",
    inkSoft: "#b3b8ca",
    kola: "#e08a6e",
    line: "#2a2e40",
    lineStrong: "#3d4259",
    shea: "#222636",
  },
  light: {
    cotton: "#f4f5f8", // ground
    cottonRaised: "#fcfcfd", // lifted surface
    indigo: "#2a3a8c", // the voice of the app: buttons, links, eyebrows
    indigoDeep: "#1b2559", // headings, Arabic
    indigoWash: "#e3e7f4", // pale wash, selected states
    ink: "#161a2e",
    inkFaint: "#666c85",
    inkSoft: "#474d66",
    kola: "#b4472a", // errors and destructive actions only
    line: "#e0e3eb",
    lineStrong: "#c9cedc",
    shea: "#e9ebf2", // secondary surface (cards),
  },
} as const;

export type Colors = { [K in keyof (typeof palettes)["light"]]: string };

/** Font family names registered in app/_layout.tsx (useFonts). Android
 *  can't pick weights inside one custom family, so each weight is a family. */
export const fonts = {
  arabic: "UthmanicHafs", // KFGQPC Uthmanic Hafs (web: --font-arabic)
  read: "Outfit", // 400, interface (web: --font-read)
  readMedium: "Outfit-Medium", // 500, labels / buttons
  readSemiBold: "Outfit-SemiBold", // 600, headings
  text: "Literata", // 400, long reading: translation, journal (web: --font-text)
  textItalic: "Literata-Italic",
} as const;

/** Spacing scale in dp, from the web's recurring paddings/gaps. */
export const space = { lg: 22, md: 16, sm: 8, xl: 32, xs: 4, xxl: 40 } as const;
export const radius = { md: 4, sm: 3 } as const;

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
  colors: palettes.light,
  pref: "light",
  scheme: "light",
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const os = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>(readThemePref);
  const scheme: Scheme =
    pref === "system" ? (os === "dark" ? "dark" : "light") : pref;

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* the choice lasts this run */
    }
    setPrefState(p);
  }, []);

  const value = useMemo(
    () => ({ colors: palettes[scheme], pref, scheme, setPref }),
    [scheme, pref, setPref]
  );
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
