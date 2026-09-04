import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="stack">
      <header style={{ paddingTop: 12 }}>
        <div className="eyebrow">MindfulVerse</div>
        <h1 style={{ margin: "6px 0 4px" }}>Sit with the Qur’an.</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Guided contemplation built from the Qur’an itself — verse, meaning, and reflection.
        </p>
      </header>

      <Link to="/checkin" className="card" style={cardLink}>
        <div className="eyebrow">Daily check-in</div>
        <strong>How is your heart today?</strong>
        <span className="muted">A verse for this moment, and a line to journal.</span>
      </Link>

      <Link to="/sessions" className="card" style={cardLink}>
        <div className="eyebrow">Tadabbur</div>
        <strong>Guided reflection sessions</strong>
        <span className="muted">Sit with a theme — verse, tafsir, and a prompt to reflect.</span>
      </Link>

      <Link to="/read" className="card" style={cardLink}>
        <div className="eyebrow">Read</div>
        <strong>Read the Qur’an</strong>
        <span className="muted">Arabic, English translation, and Ibn Kathir’s commentary.</span>
      </Link>
    </div>
  );
}

const cardLink: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "var(--ink)",
};
