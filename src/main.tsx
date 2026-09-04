import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { trackAppOpen } from "./lib/analytics";
import { recordVisit } from "./lib/progress";
import "./index.css";

trackAppOpen();
recordVisit();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
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
