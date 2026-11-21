import {
  circlesFull,
  fetchCircle,
  joinCircle,
  leaveCircle,
  MAX_JOINED_CIRCLES,
  parseCircleLink,
} from "@mindfulverse/core/circles";
import type { CircleError } from "@mindfulverse/core/circles";
import { setCircleSurah } from "@mindfulverse/core/circleSurah";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { circleStartPath } from "./home-lead";

// /circle/<code> joins a named circle on this device and opens its surah (at
// the focus verse, if set). The old /circle/<n> links still remember a surah.
export default function CircleInvite() {
  const { link } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<CircleError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const parsed = parseCircleLink(link);
    if (!parsed) {
      navigate("/", { replace: true });
      return;
    }
    if (parsed.kind === "surah") {
      leaveCircle();
      const n = setCircleSurah(parsed.surah);
      navigate(n === null ? "/" : `/tadabbur/${n}`, { replace: true });
      return;
    }
    let active = true;
    setError(null);
    void fetchCircle(parsed.code).then((result) => {
      if (!active) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (circlesFull(result.value.code)) {
        setError({
          kind: "invalid",
          message: `You’re already in ${MAX_JOINED_CIRCLES} circles. Leave one on the Circles page, then open this link again.`,
        });
        return;
      }
      joinCircle(result.value);
      navigate(circleStartPath(result.value), { replace: true });
    });
    return () => {
      active = false;
    };
  }, [link, navigate, attempt]);

  useEffect(() => {
    document.title = "Circle | MindfulVerse";
  }, []);

  if (!error) {
    return <p className="soft">Opening the circle…</p>;
  }

  return (
    <div className="stack">
      <h1>Circle</h1>
      <p className="soft" role="alert">
        {error.message}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {error.kind === "invalid" && (
          <Link to="/circles" className="btn">
            Go to Circles
          </Link>
        )}
        {error.kind !== "not-found" && error.kind !== "invalid" && (
          <button
            type="button"
            className="btn"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        )}
        <Link to="/" className="btn secondary">
          Go to Home
        </Link>
      </div>
    </div>
  );
}
