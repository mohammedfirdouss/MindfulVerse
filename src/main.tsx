import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { inject } from "@vercel/analytics";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { trackAppOpen } from "./lib/analytics";
import { AccountProvider } from "./lib/auth";
import { recordVisit } from "./lib/progress";
import { initSync } from "./lib/sync";
import "./index.css";

// A fresh deploy activates its service worker seconds after the (stale,
// precached) page renders — reload once when it takes control so a single
// refresh shows the latest build instead of two. The guard skips the very
// first SW install, where controllerchange also fires but nothing is stale.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) window.location.reload();
  });
}

trackAppOpen();
recordVisit();
inject(); // Vercel visit analytics — anonymous page views, no cookies
initSync();

ReactDOM.createRoot(document.getElementById("root")!).render(
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
  const splash = document.getElementById("splash");
  if (!splash) return;
  const elapsed = performance.now();
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    splash.classList.add("done");
    setTimeout(() => splash.remove(), 450);
  }, wait);
});
