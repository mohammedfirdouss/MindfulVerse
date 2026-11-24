import "./setup"; // must stay first: wires the core to web platform APIs
import {
  isCountedWebVisit,
  pingActiveDay,
} from "@mindfulverse/core/activeDays";
import { trackAppOpen } from "@mindfulverse/core/analytics";
import { wireCircleReflections } from "@mindfulverse/core/circles";
import { recordVisit } from "@mindfulverse/core/progress";
import { AccountProvider } from "@mindfulverse/core/sync/auth";
import { initSync } from "@mindfulverse/core/sync/engine";
import { inject } from "@vercel/analytics";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { moveToNewAddress } from "./lib/move";
import { applyTheme, getTheme } from "./lib/theme";

import "./index.css";

/** Everything that starts the app. Runs only when the page is staying. */
function boot() {
  // A fresh deploy activates its service worker seconds after the (stale,
  // precached) page renders — reload once when it takes control so a single
  // refresh shows the latest build instead of two. The guard skips the very
  // first SW install, where controllerchange also fires but nothing is stale.
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) {
        window.location.reload();
      }
    });
  }

  applyTheme(getTheme()); // index.html sets data-theme; this also syncs the status-bar colour
  trackAppOpen();
  // Only the live site, opened by a person, counts toward the launch test.
  const countVisit = isCountedWebVisit(
    window.location.hostname,
    navigator.webdriver === true
  );
  if (countVisit) {
    pingActiveDay("web");
  }
  recordVisit();
  // An installed PWA can sit suspended for days and resume without reloading —
  // count each return to the foreground as a visit (recordVisit is idempotent).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      recordVisit();
      if (countVisit) {
        pingActiveDay("web");
      }
    }
  });
  inject(); // Vercel visit analytics — anonymous page views, no cookies
  initSync();
  wireCircleReflections();

  const rootElement = document.querySelector("#root");
  if (!rootElement) {
    throw new Error("Missing #root element");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AccountProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AccountProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Dismiss the inline splash once the app has painted — but hold it on screen
  // for a minimum beat so the mark registers instead of blinking away.
  const SPLASH_MIN_MS = 1400;
  requestAnimationFrame(() => {
    const splash = document.querySelector("#splash");
    if (!splash) {
      return;
    }
    const elapsed = performance.now();
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      splash.classList.add("done");
      setTimeout(() => splash.remove(), 450);
    }, wait);
  });
}

// The old address carries everything saved to mindfulverse.app first, and
// the new address unpacks what arrived before anything reads storage
// (lib/move.ts). Either way the page reloads, so the app starts only when
// there is nothing to move.
// If a browser refuses the navigation without saying so, start anyway
// rather than leave the splash screen up.
const LEAVE_TIMEOUT_MS = 4000;
void moveToNewAddress().then((leaving) => {
  if (!leaving) {
    boot();
    return;
  }
  setTimeout(boot, LEAVE_TIMEOUT_MS);
});
