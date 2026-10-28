import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  useEffect(() => {
    document.title = "Not found | MindfulVerse";
  }, []);

  return (
    <div className="stack">
      <header>
        <h1>This page isn’t here</h1>
        <p className="soft">
          The path you followed doesn’t lead anywhere. But the Qur’an is always
          open.
        </p>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link to="/" className="btn">
          Go home
        </Link>
        <Link to="/read" className="btn secondary">
          Read the Qur’an
        </Link>
      </div>
    </div>
  );
}
