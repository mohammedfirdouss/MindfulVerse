import { useEffect, useRef, type ReactNode } from "react";

/** Bottom sheet: focus moves in and back out, Escape and the phone's back
 *  gesture close it, and the page behind stops scrolling while it's open. */
export default function Sheet({
  label,
  title,
  onClose,
  children,
}: {
  label: string;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog, and hand it back to the opener on close.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prevFocus?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // The phone's back button/gesture must close the sheet, not leave the page.
  useEffect(() => {
    const onPop = () => onClose();
    window.history.pushState({ mvSheet: true }, "");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed via ✕/backdrop/Escape: remove the extra history entry we added.
      if (window.history.state?.mvSheet) window.history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grip" />
        {/* Compact fixed header — label + close only, so the ✕ is always
            visible and tappable; long content scrolls in the body. */}
        <div className="sheet-head" style={{ alignItems: "center" }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {title}
          </p>
          <button ref={closeRef} className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </aside>
    </>
  );
}
