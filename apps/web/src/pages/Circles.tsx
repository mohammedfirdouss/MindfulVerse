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
    !surahPassageList.some((p) => portionValue({ verse: p.from, verseEnd: p.to === p.from ? null : p.to }) === values.portion);

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
  showLink = false,
}: {
  circle: Circle;
  surahName: string;
  showLink?: boolean;
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
      {showLink && <p className="circle-link">{url}</p>}
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
      </div>
    </div>
  );
}

function OwnedCircle({
  circle,
  surahs,
  joinedCode,
  onSaved,
  onDeleted,
}: {
  circle: Circle;
  surahs: SurahMap;
  joinedCode: string | null;
  onSaved: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const surahName = nameOf(surahs, circle.surah);

  async function save(draft: CircleDraft): Promise<string | null> {
    const result = await updateCircle(circle.code, draft);
    if (!result.ok) {
      return result.error.message;
    }
    onSaved(result.value);
    setMode("view");
    return null;
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
      <li className="circle-item">
        <h3 className="circle-item-name">Edit {circle.name}</h3>
        <CircleForm
          initial={circle}
          surahs={surahs}
          submitLabel="Save changes"
          onSubmit={save}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  return (
    <li className="circle-item">
      <h3 className="circle-item-name">{circle.name}</h3>
      <p className="soft circle-item-line">
        {circleSummary(circle, surahName)}
      </p>
      {joinedCode !== circle.code && <CircleCount code={circle.code} />}
      <ShareActions circle={circle} surahName={surahName} />
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
        <div className="circle-actions">
          <button
            type="button"
            className="circle-quiet"
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          {joinedCode !== circle.code && (
            <button
              type="button"
              className="circle-quiet"
              onClick={() => joinCircle(circle)}
            >
              Show on Home
            </button>
          )}
          <button
            type="button"
            className="circle-quiet circle-quiet-danger"
            onClick={() => setMode("confirm-delete")}
          >
            Delete
          </button>
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

function JoinedCircle({
  circle,
  surahs,
}: {
  circle: Circle;
  surahs: SurahMap;
}) {
  const surahName = nameOf(surahs, circle.surah);
  return (
    <section aria-labelledby="circles-joined" className="card circle-joined">
      <p className="eyebrow">Your circle</p>
      <h2 id="circles-joined" className="circle-item-name">
        {circle.name}
      </h2>
      <p className="soft circle-item-line">
        {circleSummary(circle, surahName)}
      </p>
      <CircleCount code={circle.code} />
      <div className="circle-actions">
        <Link to="/" className="btn secondary">
          Open on Home
        </Link>
        <button type="button" className="circle-quiet" onClick={leaveCircle}>
          Leave circle
        </button>
      </div>
    </section>
  );
}

function MyCircles({
  surahs,
  joinedCode,
}: {
  surahs: SurahMap;
  joinedCode: string | null;
}) {
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [created, setCreated] = useState<Circle | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let active = true;
    void listMyCircles().then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        setCircles(result.value);
      } else {
        setLoadError(result.error.message);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function create(draft: CircleDraft): Promise<string | null> {
    const result = await createCircle(draft);
    if (!result.ok) {
      return result.error.message;
    }
    setCreated(result.value);
    setCircles((list) => [result.value, ...(list ?? [])]);
    setFormKey((k) => k + 1);
    return null;
  }

  function saved(next: Circle) {
    setCircles((list) =>
      (list ?? []).map((c) => (c.code === next.code ? next : c))
    );
    setCreated((c) => (c?.code === next.code ? next : c));
  }

  function deleted(code: string) {
    setCircles((list) => (list ?? []).filter((c) => c.code !== code));
    setCreated((c) => (c?.code === code ? null : c));
  }

  // The circle just started is already shown, with its link, above.
  const listed = (circles ?? []).filter((c) => c.code !== created?.code);

  return (
    <>
      <section aria-labelledby="circles-start" className="stack">
        <h2 id="circles-start" className="circles-heading">
          Start a circle
        </h2>
        {created ? (
          <div className="notice-wash stack" role="status">
            <p>
              <strong>{created.name}</strong> is ready. Anyone with the link can
              join.
            </p>
            <ShareActions
              circle={created}
              surahName={nameOf(surahs, created.surah)}
              showLink
            />
            <button
              type="button"
              className="circle-quiet"
              onClick={() => setCreated(null)}
            >
              Start another circle
            </button>
          </div>
        ) : (
          <CircleForm
            key={formKey}
            initial={null}
            surahs={surahs}
            submitLabel="Start circle"
            onSubmit={create}
          />
        )}
      </section>

      <section aria-labelledby="circles-mine" className="stack">
        <h2 id="circles-mine" className="circles-heading">
          Your circles
        </h2>
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}
        {!loadError && circles === null && <p className="soft">Loading…</p>}
        {circles?.length === 0 && !created && <p className="soft">None yet.</p>}
        {listed.length > 0 && (
          <ul className="circle-list">
            {listed.map((c) => (
              <OwnedCircle
                key={c.code}
                circle={c}
                surahs={surahs}
                joinedCode={joinedCode}
                onSaved={saved}
                onDeleted={deleted}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function Circles() {
  const { user, loading } = useAccount();
  const [surahs, setSurahs] = useState<SurahMap>(new Map());
  const [joined, setJoined] = useState<Circle | null>(getJoinedCircle);

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
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const off = onJoinedCircleChange(setJoined);
    void refreshJoinedCircle().then(setJoined);
    return off;
  }, []);

  let body: JSX.Element;
  if (loading) {
    body = <p className="soft">Loading…</p>;
  } else if (user) {
    body = <MyCircles surahs={surahs} joinedCode={joined?.code ?? null} />;
  } else {
    body = (
      <section aria-label="Start a circle" className="stack">
        <p className="soft circles-intro">
          Sign in to start one. Joining needs no account.
        </p>
        <Link to="/account" className="btn">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <div className="stack circles">
      <header>
        <h1>Circles</h1>
        <p className="soft circles-intro">{PRIVACY_LINE}</p>
      </header>
      {joined && <JoinedCircle circle={joined} surahs={surahs} />}
      {body}
    </div>
  );
}
