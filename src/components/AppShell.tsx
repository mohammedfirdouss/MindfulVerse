import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Home", end: true },
  { to: "/checkin", label: "Check-in" },
  { to: "/sessions", label: "Tadabbur" },
  { to: "/read", label: "Read" },
  { to: "/journal", label: "Journal" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <main className="container">{children}</main>
      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? "tab active" : "tab")}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <style>{`
        .tabbar {
          position: fixed; left: 0; right: 0; bottom: 0;
          display: flex; justify-content: space-around;
          background: var(--surface); border-top: 1px solid var(--line);
          padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
          z-index: 20;
        }
        .tab { color: var(--ink-faint); font-size: .8rem; font-weight: 600; padding: 6px 10px; border-radius: 10px; }
        .tab.active { color: var(--accent); background: var(--accent-soft); }
      `}</style>
    </div>
  );
}
