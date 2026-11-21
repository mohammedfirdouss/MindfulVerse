import {
  currentPassage,
  DISCUSSION_QUESTIONS,
  nextPassage,
  surahPassages,
} from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  CIRCLE_NAME_MAX,
  circlesFull,
  createCircle,
  deleteCircle,
  fetchCircleHistory,
  finishedSurahs,
  getJoinedCircles,
  joinCircle,
  leaveCircle,
  listMyCircles,
  MAX_JOINED_CIRCLES,
  onJoinedCircleChange,
  refreshJoinedCircles,
  updateCircle,
} from "@mindfulverse/core/circles";
import type { Circle, CircleDraft } from "@mindfulverse/core/circles";
import { loadSurahs, loadThemes } from "@mindfulverse/core/data";
import { useAccount } from "@mindfulverse/core/sync/auth";
import type { SurahMeta } from "@mindfulverse/core/types";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import CircleCount from "../components/CircleCount";
import CircleQr from "../components/CircleQr";
import {
  checkCircleForm,
  circleShareMessage,
  circleShareUrl,
  circleSummary,
  passageOptionLabel,
  portionValue,
  PRIVACY_LINE,
  whatsappUrl,
} from "./circles-view";
import type { CircleFormValues } from "./circles-view";
import { circleStartPath, surahLabel } from "./home-lead";

import "./circles.css";

type SurahMap = Map<number, SurahMeta>;
type PassageMap = Map<number, Passage[]>;

const FULL_NOTE = `You can be in up to ${MAX_JOINED_CIRCLES} circles. Leave one to add this one.`;

const COPIED_MS = 2000;
const DEFAULT_SURAH = 18;

function nameOf(surahs: SurahMap, surah: number): string {
  return surahLabel(surah, surahs.get(surah));
}

function toValues(circle: Circle | null): CircleFormValues {
  return {
    name: circle?.name ?? "",
    portion: circle ? portionValue(circle) : "",
    surah: String(circle?.surah ?? DEFAULT_SURAH),
  };
}

function CircleForm({
  initial,
  surahs,
  passages,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Circle | null;
  surahs: SurahMap;
  passages: PassageMap;
  submitLabel: string;
  onSubmit: (draft: CircleDraft) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState<CircleFormValues>(() =>
    toValues(initial)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const surahPassageList = passages.get(Number(values.surah)) ?? [];
  // Keep a portion that isn't one of the surah's passages (an older focus
  // verse, say) as its own choice, so editing never drops it silently.
  const keepsOwn =
    values.portion !== "" &&
    !surahPassageList.some(
      (p) =>
        portionValue({
          verse: p.from,
          verseEnd: p.to === p.from ? null : p.to,
        }) === values.portion
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const checked = checkCircleForm(values, (s) => surahs.get(s)?.ayahCount);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setBusy(true);
    setError(null);
    const failure = await onSubmit(checked.draft);
    setBusy(false);
    setError(failure);
  }

  const set = (key: keyof CircleFormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  return (
    <form className="circle-form stack" onSubmit={(e) => void submit(e)}>
      <label className="field" htmlFor={`${id}-name`}>
        <span className="field-label">Circle name</span>
        <input
          id={`${id}-name`}
          className="field-input"
          value={values.name}
          maxLength={CIRCLE_NAME_MAX}
          placeholder="Friday friends"
          autoComplete="off"
          onChange={(e) => set("name")(e.target.value)}
        />
      </label>
      <label className="field" htmlFor={`${id}-surah`}>
        <span className="field-label">Surah</span>
        <select
          id={`${id}-surah`}
          className="field-input"
          value={values.surah}
          disabled={surahs.size === 0}
          onChange={(e) =>
            setValues((v) => ({ ...v, portion: "", surah: e.target.value }))
          }
        >
          {surahs.size === 0 ? (
            <option value={values.surah}>Loading surahs…</option>
          ) : (
            [...surahs.values()].map((s) => (
              <option key={s.number} value={String(s.number)}>
                {s.number}. {s.name}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="field" htmlFor={`${id}-portion`}>
        <span className="field-label">This week</span>
        <select
          id={`${id}-portion`}
          className="field-input"
          value={values.portion}
          onChange={(e) => set("portion")(e.target.value)}
        >
          <option value="">The whole surah</option>
          {keepsOwn && (
            <option value={values.portion}>
              {values.portion.includes("-")
                ? `Verses ${values.portion.replace("-", " to ")}`
                : `From verse ${values.portion}`}
            </option>
          )}
          {surahPassageList.map((p) => (
            <option
              key={`${p.from}-${p.to}`}
              value={portionValue({
                verse: p.from,
                verseEnd: p.to === p.from ? null : p.to,
              })}
            >
              {passageOptionLabel(p)}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="circle-actions">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ShareActions({
  circle,
  surahName,
  qrOpen,
  onToggleQr,
}: {
  circle: Circle;
  surahName: string;
  qrOpen: boolean;
  onToggleQr: () => void;
}) {
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const url = circleShareUrl(window.location.origin, circle.code);
  const message = circleShareMessage(circle, surahName, url);

  async function copy() {
    let note = "Copied";
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      note = "Couldn’t copy";
    }
    window.clearTimeout(timer.current);
    setCopyNote(note);
    timer.current = window.setTimeout(() => setCopyNote(null), COPIED_MS);
  }

  return (
    <div className="circle-share">
      <div className="circle-actions">
        <button
          type="button"
          className="btn secondary"
          aria-live="polite"
          onClick={() => void copy()}
        >
          {copyNote ?? "Copy link"}
        </button>
        <a
          className="btn secondary"
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        <button
          type="button"
          className="btn secondary"
          aria-expanded={qrOpen}
          onClick={onToggleQr}
        >
          QR code
        </button>
      </div>
      {qrOpen && (
        <figure className="circle-qr-figure">
          <CircleQr url={url} label={`QR code to join ${circle.name}`} />
          <figcaption className="soft">
            Scan with a phone camera to join {circle.name}.
          </figcaption>
        </figure>
      )}
    </div>
  );
}

/** One circle, shown once whether you started it, joined it or both: what
 *  it's reading, who's in it, how to share it, and what you can change. */
function CircleCard({
  circle,
  surahs,
  passages,
  owned,
  joined,
  onHome,
  showOnHomeLabel,
  initialQr,
  onSaved,
  onDeleted,
}: {
  circle: Circle;
  surahs: SurahMap;
  passages: PassageMap;
  owned: boolean;
  joined: boolean;
  onHome: boolean;
  showOnHomeLabel: boolean;
  initialQr: boolean;
  onSaved: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(initialQr);
  const [finished, setFinished] = useState<number[]>([]);
  const surahName = nameOf(surahs, circle.surah);
  const surahPassageList = passages.get(circle.surah) ?? [];
  const passage = currentPassage(surahPassageList, circle);
  const next = owned
    ? nextPassage(surahPassageList, circle, surahs.get(circle.surah)?.ayahCount)
    : null;

  useEffect(() => {
    let active = true;
    void fetchCircleHistory(circle.code).then((history) => {
      if (active) {
        setFinished(finishedSurahs(history).filter((n) => n !== circle.surah));
      }
    });
    return () => {
      active = false;
    };
  }, [circle.code, circle.surah]);

  async function save(draft: CircleDraft): Promise<string | null> {
    const result = await updateCircle(circle.code, draft);
    if (!result.ok) {
      return result.error.message;
    }
    onSaved(result.value);
    setMode("view");
    return null;
  }

  async function moveOn(p: Passage) {
    setBusy(true);
    setError(null);
    const result = await updateCircle(circle.code, {
      verse: p.from,
      verseEnd: p.to === p.from ? null : p.to,
    });
    setBusy(false);
    if (result.ok) {
      onSaved(result.value);
    } else {
      setError(result.error.message);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await deleteCircle(circle.code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onDeleted(circle.code);
  }

  if (mode === "edit") {
    return (
      <li className="card circle-card">
        <h3 className="circle-item-name">Edit {circle.name}</h3>
        <CircleForm
          initial={circle}
          surahs={surahs}
          passages={passages}
          submitLabel="Save changes"
          onSubmit={save}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  return (
    <li className="card circle-card">
      {onHome && showOnHomeLabel && <p className="eyebrow">On Home</p>}
      <h3 className="circle-item-name">{circle.name}</h3>
      <p className="soft circle-item-line">
        {circleSummary(circle, surahName)}
      </p>
      {passage && <p className="soft circle-theme">{passage.theme}</p>}
      <CircleCount code={circle.code} name={circle.name} />
      {finished.length > 0 && (
        <p className="circle-count">
          Read together: {finished.map((n) => nameOf(surahs, n)).join(", ")}
        </p>
      )}

      {next && (
        <div className="circle-next-row">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void moveOn(next)}
          >
            {busy ? "Moving…" : "Next week’s verses"}
          </button>
          <span className="soft circle-next">
            {passageOptionLabel({ ...next, theme: "" })}
          </span>
        </div>
      )}

      <details className="circle-discuss">
        <summary>Questions for when you meet</summary>
        <ol>
          {DISCUSSION_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <Link to={circleStartPath(circle)} className="circle-quiet">
          Read and reflect on your own first
        </Link>
      </details>

      <ShareActions
        circle={circle}
        surahName={surahName}
        qrOpen={qrOpen}
        onToggleQr={() => setQrOpen((v) => !v)}
      />

      {mode === "confirm-delete" ? (
        <div className="notice-wash stack">
          <p>Delete {circle.name}? Members keep their reflections.</p>
          <div className="circle-actions">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => setMode("view")}
            >
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div className="circle-actions circle-quiet-row">
          {!onHome && (
            <button
              type="button"
              className="circle-quiet"
              onClick={() => setError(joinCircle(circle) ? null : FULL_NOTE)}
            >
              Show on Home
            </button>
          )}
          {owned && (
            <button
              type="button"
              className="circle-quiet"
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
          )}
          {joined && !owned && (
            <button
              type="button"
              className="circle-quiet"
              onClick={() => leaveCircle(circle.code)}
            >
              Leave
            </button>
          )}
          {owned && (
            <button
              type="button"
              className="circle-quiet circle-quiet-danger"
              onClick={() => setMode("confirm-delete")}
            >
              Delete
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

export default function Circles() {
  const { user, loading } = useAccount();
  const [surahs, setSurahs] = useState<SurahMap>(new Map());
  const [passages, setPassages] = useState<PassageMap>(new Map());
  const [joined, setJoined] = useState<Circle[]>(getJoinedCircles);
  const [owned, setOwned] = useState<Circle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Circles | MindfulVerse";
  }, []);

  useEffect(() => {
    let active = true;
    loadSurahs()
      .then((list) => {
        if (active) {
          setSurahs(new Map(list.map((s) => [s.number, s])));
        }
      })
      .catch(() => {});
    loadThemes()
      .then((themes) => {
        if (!active) {
          return;
        }
        const bySurah: PassageMap = new Map();
        for (let n = 1; n <= 114; n += 1) {
          bySurah.set(n, surahPassages(themes, n));
        }
        setPassages(bySurah);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const off = onJoinedCircleChange(() => setJoined(getJoinedCircles()));
    void refreshJoinedCircles().then(setJoined);
    return off;
  }, []);

  useEffect(() => {
    if (!user) {
      setOwned(null);
      return;
    }
    let active = true;
    void listMyCircles().then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        setOwned(result.value);
      } else {
        setLoadError(result.error.message);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  const ownedCodes = new Set((owned ?? []).map((c) => c.code));
  const joinedCodes = joined.map((c) => c.code);
  // Each circle once: the ones on this device first (Home's first), then the
  // rest you started. A joined circle you own uses the owner's fresh copy.
  const byCode = new Map((owned ?? []).map((c) => [c.code, c]));
  const circles = [
    ...joined.map((c) => byCode.get(c.code) ?? c),
    ...(owned ?? []).filter((c) => !joinedCodes.includes(c.code)),
  ];
  const showForm = formOpen || (user !== null && circles.length === 0);

  async function create(draft: CircleDraft): Promise<string | null> {
    if (circlesFull()) {
      return FULL_NOTE;
    }
    const result = await createCircle(draft);
    if (!result.ok) {
      return result.error.message;
    }
    setOwned((list) => [result.value, ...(list ?? [])]);
    setCreated(result.value.code);
    setFormOpen(false);
    setFormKey((k) => k + 1);
    return null;
  }

  function saved(next: Circle) {
    setOwned((list) =>
      (list ?? []).map((c) => (c.code === next.code ? next : c))
    );
  }

  function deleted(code: string) {
    setOwned((list) => (list ?? []).filter((c) => c.code !== code));
  }

  let start: JSX.Element | null = null;
  if (loading) {
    start = null;
  } else if (!user) {
    start = (
      <section aria-label="Start a circle" className="stack">
        <p className="soft circles-intro">
          Sign in to start one. Joining needs no account.
        </p>
        <Link to="/account" className="btn">
          Sign in
        </Link>
      </section>
    );
  } else if (showForm) {
    start = (
      <section aria-labelledby="circles-start" className="stack">
        <h2 id="circles-start" className="circles-heading">
          Start a circle
        </h2>
        <CircleForm
          key={formKey}
          initial={null}
          surahs={surahs}
          passages={passages}
          submitLabel="Start circle"
          onSubmit={create}
          onCancel={circles.length > 0 ? () => setFormOpen(false) : undefined}
        />
      </section>
    );
  } else {
    start = (
      <div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setFormOpen(true)}
        >
          Start a circle
        </button>
      </div>
    );
  }

  return (
    <div className="stack circles">
      <header>
        <h1>Circles</h1>
        <p className="soft circles-intro">{PRIVACY_LINE}</p>
      </header>
      {created && (
        <p className="notice-wash" role="status">
          Your circle is ready. Share the link or the QR code below.
        </p>
      )}
      {loadError && (
        <p className="form-error" role="alert">
          {loadError}
        </p>
      )}
      {circles.length > 0 && (
        <ul className="circle-list stack" aria-label="Your circles">
          {circles.map((c) => (
            <CircleCard
              key={c.code}
              circle={c}
              surahs={surahs}
              passages={passages}
              owned={ownedCodes.has(c.code)}
              joined={joinedCodes.includes(c.code)}
              onHome={joinedCodes[0] === c.code}
              showOnHomeLabel={circles.length > 1}
              initialQr={c.code === created}
              onSaved={saved}
              onDeleted={deleted}
            />
          ))}
        </ul>
      )}
      {start}
    </div>
  );
}
