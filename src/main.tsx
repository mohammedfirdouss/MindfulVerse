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

// Dismiss the inline splash once the app has painted.
requestAnimationFrame(() => {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("done");
    setTimeout(() => splash.remove(), 450);
  }
});
