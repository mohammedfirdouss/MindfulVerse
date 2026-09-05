import { useEffect, useState } from "react";

// A quiet, dismissible nudge to install the PWA. An icon on the home screen is
// the strongest return-visit mechanic a backend-less app has.
// - Chromium/Android: captures `beforeinstallprompt` and offers a real install.
// - iOS Safari: shows the "Share → Add to Home Screen" tip instead.

const DISMISS_KEY = "mindfulverse.installDismissed.v1";

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
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    if (isIos()) {
      // No install API on iOS — show the manual tip after a short beat.
      const t = window.setTimeout(() => setShowIosTip(true), 4000);
      return () => window.clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [dismissed]);

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

  if (dismissed || (!installEvent && !showIosTip)) return null;

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
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ flex: 1, fontSize: ".95rem", lineHeight: 1.45 }}>
        {installEvent ? (
          <>Keep MindfulVerse on your home screen — it works offline.</>
        ) : (
          <>
            Add MindfulVerse to your home screen: tap <strong>Share</strong>, then{" "}
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
            borderRadius: 5,
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
