import {
  TRANSLATION_CREDIT,
  TRANSLATION_LICENSE,
  TRANSLATION_SOURCE_URL,
} from "@mindfulverse/core/translation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { functionsBase, startVerification, verifyDomain } from "../lib/apiKeys";
import type { StartResult } from "../lib/apiKeys";

import "./developers.css";
import {
  SAMPLE_ARABIC,
  SAMPLE_REFERENCE,
  SAMPLE_TRANSLATION,
} from "./sample-verse";

const COPIED_MS = 2000;
const SITE_URL_HINT = "https://example.com";

interface CopyButtonProps {
  label: string;
  text: string;
}

const CopyButton = ({ label, text }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn secondary dev-copy"
        aria-label={label}
        onClick={copy}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <output className="dev-sr">{copied ? "Copied to clipboard" : ""}</output>
    </>
  );
};

interface CopyRowProps {
  label: string;
  text: string;
  title: string;
}

const CopyRow = ({ label, text, title }: CopyRowProps) => (
  <div className="dev-copy-row">
    <p className="dev-copy-title">{title}</p>
    <div className="dev-copy-line">
      <code className="dev-code-inline">{text}</code>
      <CopyButton label={label} text={text} />
    </div>
  </div>
);

const curlExample = (base: string) =>
  `curl "${base}/functions/daily-verse?tz=Africa/Lagos" \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "X-Seed: a-stable-id-for-this-reader"`;

const fetchExample = (base: string) =>
  `const res = await fetch("${base}/functions/daily-verse?tz=" + encodeURIComponent(tz), {
  headers: {
    Authorization: "Bearer YOUR_KEY",
    "X-Seed": readerId,
  },
});
const verse = await res.json();`;

export default function Developers() {
  const base = functionsBase();
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState<StartResult | null>(null);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    document.title = "Developers | MindfulVerse";
  }, []);

  const onStart = async (e: FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setError("Please agree to the terms to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const email = contactEmail.trim();
      const result = await startVerification({
        acceptTerms: true,
        siteName: siteName.trim(),
        siteUrl: siteUrl.trim(),
        ...(email ? { contactEmail: email } : {}),
      });
      setStarted(result);
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : "Something went wrong."
      );
    }
    setBusy(false);
  };

  const onVerify = async () => {
    if (!started) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await verifyDomain(started.domain, started.token);
      setApiKey(result.apiKey);
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : "Something went wrong."
      );
    }
    setBusy(false);
  };

  const startOver = () => {
    setStarted(null);
    setApiKey("");
    setError("");
  };

  return (
    <div className="dev stack">
      <header>
        <h1>A verse a day, for your site</h1>
        <p className="dev-lede">
          Show your readers one verse each day. We draw from a curated pool of
          verses chosen for reflection, and every reader gets the same verse the
          MindfulVerse app would show them. It is free for non-commercial use.
        </p>
      </header>

      <section className="stack" aria-labelledby="dev-key-title">
        <h2 id="dev-key-title">Get a key</h2>
        {apiKey ? (
          <div className="card stack" aria-live="polite">
            <p className="dev-copy-title">Your key for {started?.domain}</p>
            <div className="dev-copy-line">
              <code className="dev-code-inline">{apiKey}</code>
              <CopyButton label="Copy your API key" text={apiKey} />
            </div>
            <p className="soft">
              Copy it now. We only keep a fingerprint, so we can’t show it
              again.
            </p>
            <button type="button" className="link-btn" onClick={startOver}>
              Get a key for another site
            </button>
          </div>
        ) : null}

        {!apiKey && started ? (
          <div className="card stack">
            <p>
              Show us that you run <strong>{started.domain}</strong> by doing
              one of these. Then choose Verify.
            </p>
            <CopyRow
              label="Copy the verification file URL"
              text={started.fileUrl}
              title="Option 1: serve this token at this address"
            />
            <p className="soft dev-note">
              The file should contain only this token: {started.token}
            </p>
            <p className="soft dev-note">
              We check your bare domain over HTTPS, and if that fails we also
              try the www version of it. The file or the meta tag must be served
              there.
            </p>
            <CopyRow
              label="Copy the meta tag"
              text={started.metaTag}
              title="Option 2: add this meta tag to your home page"
            />
            <div className="dev-actions">
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={onVerify}
              >
                {busy ? "Checking…" : "Verify"}
              </button>
              <button type="button" className="link-btn" onClick={startOver}>
                Start over
              </button>
            </div>
          </div>
        ) : null}

        {!apiKey && !started ? (
          <form className="card stack dev-form" onSubmit={onStart}>
            <div className="field">
              <label className="field-label" htmlFor="dev-name">
                Site name
              </label>
              <input
                id="dev-name"
                className="field-input"
                type="text"
                required
                autoComplete="organization"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="dev-url">
                Site URL
              </label>
              <input
                id="dev-url"
                className="field-input"
                type="url"
                required
                inputMode="url"
                placeholder={SITE_URL_HINT}
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="dev-email">
                Contact email (optional)
              </label>
              <input
                id="dev-email"
                className="field-input"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <label className="dev-terms" htmlFor="dev-terms">
              <input
                id="dev-terms"
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>I agree to the terms below.</span>
            </label>
            <div className="dev-actions">
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "Starting…" : "Continue"}
              </button>
            </div>
          </form>
        ) : null}

        <output className="dev-error" aria-live="polite">
          {error}
        </output>
      </section>

      <section className="stack" aria-labelledby="dev-call-title">
        <h2 id="dev-call-title">Call it</h2>
        <p>
          Send your key as a bearer token, the reader’s time zone as{" "}
          <code>tz</code>, and a stable id for the reader as <code>X-Seed</code>{" "}
          so each reader keeps their own verse. Read the time zone in the
          browser with{" "}
          <code>Intl.DateTimeFormat().resolvedOptions().timeZone</code>.
        </p>
        <pre
          className="dev-code"
          aria-label="curl example"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable code must be keyboard reachable
          tabIndex={0}
        >
          <code>{curlExample(base)}</code>
        </pre>
        <pre
          className="dev-code"
          aria-label="fetch example"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable code must be keyboard reachable
          tabIndex={0}
        >
          <code>{fetchExample(base)}</code>
        </pre>
        <p>
          Call from your server where you can. Browser calls only work from the
          verified domain or its subdomains, and other origins get a 403.
        </p>
        <p>
          Each key can make 10,000 verse requests per UTC day. A 429 means the
          limit is reached, so try again tomorrow (UTC). Requesting keys is
          limited to 20 starts and 20 verifies per IP address per day, and 10
          verifies per domain per day.
        </p>
        <p>
          Errors come back as JSON like{" "}
          <code>{'{ "error": "...", "message": "..." }'}</code> with one of
          these codes: 400 for bad input, 401 for a missing, unknown or revoked
          key, 403 for an origin that is not allowed, 429 for a reached limit,
          and 500 or 502 when the problem is on our side, so retry later.
        </p>
      </section>

      <section className="stack" aria-labelledby="dev-card-title">
        <h2 id="dev-card-title">What you get back</h2>
        <p>
          The response has the Arabic, the translation, the credit line and a{" "}
          <code>reflectUrl</code> that opens the verse in MindfulVerse. Here is
          one shown as a card.
        </p>
        <article className="cloth dev-example" aria-label="Example verse card">
          <p className="arabic" lang="ar">
            {SAMPLE_ARABIC}
          </p>
          <p className="translation">{SAMPLE_TRANSLATION}</p>
          <p className="cloth-soft dev-example-ref">{SAMPLE_REFERENCE}</p>
          <p className="cloth-soft dev-example-credit">
            {TRANSLATION_CREDIT}{" "}
            <a
              href={TRANSLATION_LICENSE.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {TRANSLATION_LICENSE.name}
            </a>
          </p>
        </article>
        <p className="soft dev-note">
          The verse text is real. The date and other fields in an actual
          response will differ from day to day.
        </p>
      </section>

      <section className="stack" aria-labelledby="dev-terms-title">
        <h2 id="dev-terms-title">Terms</h2>
        <ul className="dev-list">
          <li>Use it for non-commercial purposes only.</li>
          <li>
            Show the credit with the translation:{" "}
            <a
              href={TRANSLATION_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {TRANSLATION_CREDIT}
            </a>
          </li>
          <li>Do not edit the text.</li>
          <li>Cache each response until its validUntil time.</li>
          <li>We can revoke a key that is misused.</li>
          <li>We don’t keep your users’ IDs or time zones in our database.</li>
        </ul>
      </section>
    </div>
  );
}
