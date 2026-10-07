import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import InstallPrompt from "./InstallPrompt";
import { getTheme, setTheme, type Theme } from "../lib/theme";
import "./shell.css";

/* --- Nav icons, drawn like the mobile tab icons (apps/mobile/src/ui/icons.tsx):
   a 24-unit grid, 1.6 stroke, currentColor. The open page's motif is filled. --- */

function IconBase({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {children}
    </svg>
  );
}

type NavIconProps = { active: boolean };

/** A tinted fill for the open page's motif (the mobile tab's 18% fill). */
const tint = (active: boolean) =>
  active ? { fill: "currentColor", fillOpacity: 0.18 } : { fill: "none" };

/** Home: the adire diamond, today's verse at its centre. */
function HomeIcon({ active }: NavIconProps) {
  return (
    <IconBase>
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" />
      <path d="M12 8.2 15.8 12 12 15.8 8.2 12Z" fill={active ? "currentColor" : "none"} />
    </IconBase>
  );
}

/** Check-in: a heart, the day's turning toward the verse. */
function HeartIcon({ active }: NavIconProps) {
  return (
    <IconBase>
      <path
        d="M12 20.2S3.6 15.2 3.6 9.5c0-2.8 2.2-4.7 4.5-4.7 1.6 0 3 .9 3.9 2.2.9-1.3 2.3-2.2 3.9-2.2 2.3 0 4.5 1.9 4.5 4.7 0 5.7-8.4 10.7-8.4 10.7Z"
        {...tint(active)}
      />
    </IconBase>
  );
}

/** Tadabbur: ripples spreading from a still point. */
function TadabburNavIcon({ active }: NavIconProps) {
  return (
    <IconBase>
      <path d="M12 9.6 14.4 12 12 14.4 9.6 12Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5.6" {...tint(active)} />
      <circle cx="12" cy="12" r="9.4" strokeDasharray="2.2 2.6" />
    </IconBase>
  );
}

/** Read: an open mushaf. */
function MushafIcon({ active }: NavIconProps) {
  return (
    <IconBase>
      <path
        d="M2.8 5.6C6 4.6 9.2 5 12 6.8c2.8-1.8 6-2.2 9.2-1.2v13c-3.2-1-6.4-.6-9.2 1.2-2.8-1.8-6-2.2-9.2-1.2Z"
        {...tint(active)}
      />
      <path d="M12 6.8v13" />
    </IconBase>
  );
}

/** Journal: a reed pen over its line. */
function PenIcon({ active }: NavIconProps) {
  return (
    <IconBase>
      <path d="M6 17.2 7 13.4l8.9-8.9a1.9 1.9 0 0 1 2.7 2.7l-8.9 8.9Z" {...tint(active)} />
      <path d="M3.5 20.5h17" />
    </IconBase>
  );
}

/** Account: a person. */
function PersonIcon({ active }: NavIconProps) {
  return (
    <IconBase>
      <circle cx="12" cy="8.4" r="3.6" {...tint(active)} />
      <path d="M4.8 20.2c1-4.6 13.4-4.6 14.4 0" />
    </IconBase>
  );
}

const tabs = [
  { to: "/", label: "Home", end: true, Icon: HomeIcon },
  { to: "/checkin", label: "Check-in", Icon: HeartIcon },
  { to: "/sessions", label: "Tadabbur", Icon: TadabburNavIcon },
  { to: "/read", label: "Read", Icon: MushafIcon },
  { to: "/journal", label: "Journal", Icon: PenIcon },
  { to: "/account", label: "Account", Icon: PersonIcon },
];

const COLLAPSE_KEY = "mindfulverse.sidebarCollapsed.v1";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function MoonIcon() {
  return (
    <IconBase>
      <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5Z" />
    </IconBase>
  );
}

function SunIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </IconBase>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  // A new page starts at the top. Keyed on the path only, so in-page query
  // changes (?v= deep links, ?set=, ?q=) keep their scroll position.
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [theme, setThemeState] = useState<Theme>(getTheme);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* private mode — non-fatal */
      }
      return next;
    });
  }

  return (
    <div className={collapsed ? "shell shell-collapsed" : "shell"}>
      <nav className="sidebar" aria-label="Primary">
        <div className="side-wordmark" aria-hidden={collapsed}>
          <span className="wordmark-full">MindfulVerse</span>
          <span className="wordmark-mini" aria-hidden="true">M</span>
        </div>
        <div className="side-links">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              title={collapsed ? t.label : undefined}
              className={({ isActive }) =>
                isActive ? "side-link active" : "side-link"
              }
            >
              {({ isActive }) => (
                <>
                  <t.Icon active={isActive} />
                  <span className="side-label">{t.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <button
          type="button"
          className="side-collapse"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <IconBase>
            {collapsed ? <path d="M9 5l7 7-7 7" /> : <path d="M15 5l-7 7 7 7" />}
          </IconBase>
        </button>
      </nav>

      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to night mode"}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <main className="container">{children}</main>
      <InstallPrompt />

      <nav className="tabbar" aria-label="Primary">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? "tab active" : "tab")}
          >
            {({ isActive }) => (
              <>
                <t.Icon active={isActive} />
                <span className="tab-label">{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
