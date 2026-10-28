import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./components/AppShell";
import Account from "./pages/Account";
import CheckIn from "./pages/CheckIn";
import Dhikr from "./pages/Dhikr";
import Home from "./pages/Home";
import Journal from "./pages/Journal";
import Juz from "./pages/Juz";
import NotFound from "./pages/NotFound";
import Reader from "./pages/Reader";
import Search from "./pages/Search";
import SessionPlayer from "./pages/SessionPlayer";
import Sessions from "./pages/Sessions";
import Stats from "./pages/Stats";
import Surah from "./pages/Surah";
import SurahTadabbur from "./pages/SurahTadabbur";
import Themes from "./pages/Themes";

// All routes are declared here ONCE so feature agents never touch this file —
// each agent owns its own page component under src/pages.
export default function App() {
  return (
    <AppShell>
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
        <Route path="/tadabbur/:surah" element={<SurahTadabbur />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/search" element={<Search />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="/dhikr" element={<Dhikr />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}
