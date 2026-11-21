import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./components/AppShell";
import CheckIn from "./pages/CheckIn";
import Home from "./pages/Home";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";
import Reader from "./pages/Reader";
import Sessions from "./pages/Sessions";
import Surah from "./pages/Surah";
import SurahTadabbur from "./pages/SurahTadabbur";

// Rarely visited pages load on demand; the service worker precaches their
// chunks, so they still open offline.
const Account = lazy(() => import("./pages/Account"));
const CircleInvite = lazy(() => import("./pages/CircleInvite"));
const Circles = lazy(() => import("./pages/Circles"));
const Developers = lazy(() => import("./pages/Developers"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Dhikr = lazy(() => import("./pages/Dhikr"));
const Juz = lazy(() => import("./pages/Juz"));
const Search = lazy(() => import("./pages/Search"));
const SessionPlayer = lazy(() => import("./pages/SessionPlayer"));
const Stats = lazy(() => import("./pages/Stats"));
const SurahJournal = lazy(() => import("./pages/SurahJournal"));
const Themes = lazy(() => import("./pages/Themes"));

// All routes are declared here ONCE so feature agents never touch this file —
// each agent owns its own page component under src/pages.
export default function App() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/read" element={<Reader />} />
          <Route path="/read/:surah" element={<Surah />} />
          <Route
            path="/read/juz"
            element={<Navigate to="/read?tab=juz" replace />}
          />
          <Route path="/read/juz/:n" element={<Juz />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:id" element={<SessionPlayer />} />
          <Route path="/tadabbur/:surah/journal" element={<SurahJournal />} />
          <Route path="/tadabbur/:surah" element={<SurahTadabbur />} />
          <Route path="/circle/:link" element={<CircleInvite />} />
          <Route path="/circles" element={<Circles />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/search" element={<Search />} />
          <Route path="/themes" element={<Themes />} />
          <Route path="/dhikr" element={<Dhikr />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
