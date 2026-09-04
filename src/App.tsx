import { Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import Reader from "./pages/Reader";
import Surah from "./pages/Surah";
import Sessions from "./pages/Sessions";
import SessionPlayer from "./pages/SessionPlayer";
import CheckIn from "./pages/CheckIn";
import Journal from "./pages/Journal";
import Stats from "./pages/Stats";
import Search from "./pages/Search";
import Themes from "./pages/Themes";
import NotFound from "./pages/NotFound";

// All routes are declared here ONCE so feature agents never touch this file —
// each agent owns its own page component under src/pages.
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/read" element={<Reader />} />
        <Route path="/read/:surah" element={<Surah />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionPlayer />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/search" element={<Search />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}
