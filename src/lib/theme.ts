// User-controlled theme. Defaults to light and NEVER follows the OS setting —
// the identity is light; night mode is an explicit choice (tahajjud reading).
const KEY = "mindfulverse.theme.v1";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme): void {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#1b2559" : "#2a3a8c");
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  applyTheme(theme);
}
