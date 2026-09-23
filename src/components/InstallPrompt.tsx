import { useEffect, useState } from "react";
import { getEntries, JOURNAL_SAVED_EVENT } from "../lib/journal";

// A quiet, dismissible nudge to install the PWA. An icon on the home screen is
// the strongest return-visit mechanic a backend-less app has.
// It is earned, not demanded: it only appears once the user has saved a
// reflection, so the ask comes after the app has given them something.
// - Chromium/Android: captures `beforeinstallprompt` and offers a real install.
// - iOS Safari: shows the "Share → Add to Home Screen" tip instead.

const DISMISS_KEY = "mindfulverse.installDismissed.v1";
// Let the "saved" confirmation land before asking for anything.
const AFTER_SAVE_MS = 1500;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [earned, setEarned] = useState(() => getEntries().length > 0);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );

  // Chromium fires this once, early — hold on to it until the prompt is earned.
  useEffect(() => {
    if (dismissed || isStandalone() || isIos()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [dismissed]);

  useEffect(() => {
    if (earned || dismissed) return;
    let t: number | undefined;
    const onSaved = () => {
      t = window.setTimeout(() => setEarned(true), AFTER_SAVE_MS);
    };
    window.addEventListener(JOURNAL_SAVED_EVENT, onSaved);
    return () => {
      window.removeEventListener(JOURNAL_SAVED_EVENT, onSaved);
      window.clearTimeout(t);
    };
  }, [earned, dismissed]);

  const showIosTip = isIos() && !isStandalone();

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
    dismiss();
  }

  if (dismissed || !earned || (!installEvent && !showIosTip)) return null;

  return (
    <div
      role="region"
      aria-label="Install MindfulVerse"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 76,
        zIndex: 30,
        maxWidth: 560,
        margin: "0 auto",
        background: "var(--indigo-deep)",
        color: "var(--cotton-raised)",
        borderRadius: "var(--radius)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ flex: 1, fontSize: ".95rem", lineHeight: 1.45 }}>
        {installEvent ? (
          <>Come back to this tomorrow — keep MindfulVerse on your home screen. It works offline.</>
        ) : (
          <>
            Come back to this tomorrow — tap <strong>Share</strong>, then{" "}
            <strong>Add to Home Screen</strong>. It works offline.
          </>
        )}
      </div>
      {installEvent && (
        <button
          onClick={() => void install()}
          style={{
            background: "var(--cotton-raised)",
            color: "var(--indigo-deep)",
            border: "none",
            borderRadius: 3,
            padding: "9px 14px",
            font: "inherit",
            fontWeight: 600,
            cursor: "pointer",
            flex: "none",
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "var(--cotton-raised)",
          opacity: 0.7,
          fontSize: "1.2rem",
          cursor: "pointer",
          padding: 4,
          flex: "none",
        }}
      >
        ✕
      </button>
    </div>
  );
}
