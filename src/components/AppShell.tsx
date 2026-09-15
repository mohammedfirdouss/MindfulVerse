import { NavLink } from "react-router-dom";
import { useState, type ReactNode } from "react";
import InstallPrompt from "./InstallPrompt";
import { getTheme, setTheme, type Theme } from "../lib/theme";

/* --- Inline stroke icons: 22px, currentColor, calm 1.8 stroke --- */

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <IconBase>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9v11h13V9" />
      <path d="M10 20v-5.5h4V20" />
    </IconBase>
  );
}

function HeartIcon() {
  return (
    <IconBase>
      <path d="M12 20.5S3.5 15.3 3.5 9.4C3.5 6.4 5.9 4.5 8.2 4.5c1.6 0 3 .9 3.8 2.2.8-1.3 2.2-2.2 3.8-2.2 2.3 0 4.7 1.9 4.7 4.9 0 5.9-8.5 11.1-8.5 11.1Z" />
    </IconBase>
  );
}

/* Tadabbur — open book, pages fanned for reflection */
function OpenBookIcon() {
  return (
    <IconBase>
      <path d="M12 6.5C10.5 5 8.2 4.3 5.5 4.3c-.9 0-1.8.1-2.5.3v13.6c.7-.2 1.6-.3 2.5-.3 2.7 0 5 .7 6.5 2.2 1.5-1.5 3.8-2.2 6.5-2.2.9 0 1.8.1 2.5.3V4.6c-.7-.2-1.6-.3-2.5-.3-2.7 0-5 .7-6.5 2.2Z" />
      <path d="M12 6.5V20" />
    </IconBase>
  );
}

/* Read — closed mushaf with lines of text, distinct from tadabbur */
function MushafIcon() {
  return (
    <IconBase>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17.5H7.5A2.5 2.5 0 0 0 5 22V4.5Z" />
      <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19" />
      <path d="M9.5 7h6M9.5 10.5h6" />
    </IconBase>
  );
}

function PenIcon() {
  return (
    <IconBase>
      <path d="M4 20s.5-3.5 1.5-4.5L16.8 4.2a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L8.5 18.5C7.5 19.5 4 20 4 20Z" />
      <path d="M14.5 6.5l3 3" />
    </IconBase>
  );
}

/* Account — simple person glyph, consistent stroke set */
function PersonIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c.9-3.9 4-6 7.2-6s6.3 2.1 7.2 6" />
    </IconBase>
  );
}

const tabs = [
  { to: "/", label: "Home", end: true, icon: <HomeIcon /> },
  { to: "/checkin", label: "Check-in", icon: <HeartIcon /> },
  { to: "/sessions", label: "Tadabbur", icon: <OpenBookIcon /> },
  { to: "/read", label: "Read", icon: <MushafIcon /> },
  { to: "/journal", label: "Journal", icon: <PenIcon /> },
  { to: "/account", label: "Account", icon: <PersonIcon /> },
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
              {t.icon}
              <span className="side-label">{t.label}</span>
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
            {t.icon}
            <span className="tab-label">{t.label}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        /* --- Theme toggle: quiet, below the adire band --- */
        .theme-toggle {
          position: fixed; top: 22px; right: 14px; z-index: 25;
          width: 40px; height: 40px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--cotton-raised); border: 1px solid var(--line);
          color: var(--ink-soft); cursor: pointer;
          transition: color .15s ease, background .15s ease;
        }
        .theme-toggle:hover { color: var(--indigo); }
        .theme-toggle:active { transform: scale(0.94); }
        @media (min-width: 900px) { .theme-toggle { top: 26px; right: 22px; } }

        /* --- Mobile: fixed bottom tab bar, icon above small label --- */
        .tabbar {
          position: fixed; left: 0; right: 0; bottom: 0;
          display: flex; justify-content: space-around;
          background: var(--surface); border-top: 1px solid var(--line);
          padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
          z-index: 20;
        }
        .tab {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          color: var(--ink-faint); font-weight: 500;
          padding: 6px 12px; border-radius: 3px;
          transition: color .15s ease, background .15s ease;
        }
        .tab-label { font-size: .68rem; line-height: 1.2; }
        .tab:active { transform: scale(0.96); }
        .tab.active { color: var(--cotton-raised); background: var(--indigo); }

        /* --- Desktop sidebar (hidden on mobile) --- */
        .sidebar { display: none; }

        @media (min-width: 900px) {
          .tabbar { display: none; }

          .shell { --sidebar-w: 220px; }
          .shell.shell-collapsed { --sidebar-w: 64px; }

          .sidebar {
            position: fixed; top: 12px; bottom: 0; left: 0;
            width: var(--sidebar-w);
            display: flex; flex-direction: column;
            background: var(--cotton-raised);
            border-right: 1px solid var(--line);
            padding: 22px 12px 16px;
            z-index: 20;
            overflow: hidden;
            transition: width .2s var(--ease-out);
          }

          .side-wordmark {
            font-family: var(--font-read);
            color: var(--indigo-deep);
            font-weight: 600; font-size: 1.15rem; letter-spacing: -0.015em;
            padding: 0 10px 22px;
            white-space: nowrap;
          }
          .wordmark-mini { display: none; }
          .shell-collapsed .wordmark-full { display: none; }
          .shell-collapsed .wordmark-mini { display: inline; }
          .shell-collapsed .side-wordmark { text-align: center; padding-left: 0; padding-right: 0; }

          .side-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
          .side-link {
            display: flex; align-items: center; gap: 12px;
            padding: 10px; border-radius: 3px;
            color: var(--ink-soft); font-weight: 500; font-size: .95rem;
            white-space: nowrap;
            transition: color .15s ease, background .15s ease;
          }
          .side-link svg { flex: none; }
          .side-link:hover { background: var(--cotton); color: var(--indigo); }
          .side-link.active { background: var(--indigo-wash); color: var(--indigo); }
          .shell-collapsed .side-link { justify-content: center; padding-left: 0; padding-right: 0; }
          .shell-collapsed .side-label { display: none; }

          .side-collapse {
            display: inline-flex; align-items: center; justify-content: center;
            align-self: flex-end;
            width: 40px; height: 40px;
            background: none; border: none; border-radius: 3px;
            color: var(--ink-faint); cursor: pointer;
            transition: color .15s ease, background .15s ease;
          }
          .side-collapse:hover { background: var(--cotton); color: var(--indigo); }
          .shell-collapsed .side-collapse { align-self: center; }

          /* Clear the sidebar, and center the column in the remaining space. */
          .shell main.container {
            margin-left: max(var(--sidebar-w), calc(var(--sidebar-w) + (100% - var(--sidebar-w) - var(--maxw)) / 2));
            margin-right: 0;
            max-width: var(--maxw);
            padding-bottom: 56px;
            transition: margin-left .2s var(--ease-out);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sidebar, .shell main.container { transition: none; }
        }
      `}</style>
    </div>
  );
}
