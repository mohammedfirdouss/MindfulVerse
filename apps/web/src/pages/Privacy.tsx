import { useEffect } from "react";
import { Link } from "react-router-dom";

import FeedbackLink from "../components/FeedbackLink";

import "./privacy.css";

/** The privacy policy, in plain words. Linked from Home, Account and the
 *  Play Store listing; keep it true to what the code does. */
export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy | MindfulVerse";
  }, []);

  return (
    <article className="stack privacy">
      <header>
        <h1>Privacy</h1>
        <p className="soft">Last updated 21 November 2026</p>
      </header>

      <p>
        MindfulVerse is a free app for pondering the Qur’an. What you write in
        it is personal, so it is kept to a minimum and never sold, shared for
        advertising, or used to train AI. There are no ads.
      </p>

      <h2>Without an account</h2>
      <p>
        You can use all of MindfulVerse without signing in. Your journal,
        progress, settings and the circles you joined are saved only on your
        device. They do not leave it.
      </p>
      <p>Two small things are sent, and neither says who you are:</p>
      <ul>
        <li>
          <strong>A daily “opened today” signal.</strong> A random number made
          on your device, the date and whether it is the web app or the Android
          app. It is how we count how many people come back. It holds no name,
          email or writing.
        </li>
        <li>
          <strong>Circle counts.</strong> If you join a circle, the same random
          number is used to count how many people are in it and how many
          reflected this week. Nobody, including the circle’s owner, can see who
          those people are or what they wrote.
        </li>
      </ul>
      <p>
        The website also counts page views with Vercel Web Analytics. It uses no
        cookies and does not identify you.
      </p>

      <h2>With an account</h2>
      <p>
        An account is optional. It backs up your journal and progress so they
        follow you to another device. When you sign in, we store:
      </p>
      <ul>
        <li>your email address and sign-in details (or your Google sign-in)</li>
        <li>your journal entries</li>
        <li>
          your progress: the days you opened the app, where you are in each
          surah and session, and the last verse you read
        </li>
        <li>
          if you turn on the daily reminder, the time and time zone for it and
          the address your browser or phone gives us to send it
        </li>
        <li>the circles you start: their name, surah and this week’s verses</li>
      </ul>
      <p>
        Only you can read your journal and progress. The database lets each
        account read and change only its own rows. Your journal is not encrypted
        end to end, though: like most apps, the people who run the server could
        technically read it. We do not look at it, and we never will except to
        fix a problem you ask us to fix.
      </p>

      <h2>Who helps run the app</h2>
      <ul>
        <li>
          <strong>InsForge</strong> stores accounts and synced data, and sends
          reminders.
        </li>
        <li>
          <strong>Vercel</strong> hosts the website and counts page views.
        </li>
        <li>
          <strong>Expo</strong> delivers reminders to the Android app.
        </li>
        <li>
          <strong>Google</strong> handles sign-in, only if you choose “Sign in
          with Google”.
        </li>
      </ul>
      <p>
        The Qur’an text, translation, commentary and fonts are part of the app
        itself, so reading never calls anyone else.
      </p>

      <h2>Deleting your data</h2>
      <ul>
        <li>
          <strong>Your account:</strong> sign in, open{" "}
          <Link to="/account">Account</Link> and choose Delete account. This
          deletes your email and sign-in, your synced journal and progress, your
          reminders and the circles you started, straight away. It can’t be
          undone.
        </li>
        <li>
          <strong>This device:</strong> clear the site’s data in your browser,
          or uninstall the Android app.
        </li>
        <li>
          <strong>Your journal, to keep:</strong> on the Journal page, download
          it as a PDF or as plain text first.
        </li>
      </ul>
      <p>
        The anonymous “opened today” and circle counts can’t be linked back to
        you, so they are not deleted with an account.
      </p>

      <h2>Children</h2>
      <p>
        MindfulVerse is not made for children under 13, and we do not knowingly
        collect their data. If you think a child has made an account, write to
        us and we will delete it.
      </p>

      <h2>Questions</h2>
      <p>
        Write to us any time and we will reply.{" "}
        <FeedbackLink
          subject="About my privacy on MindfulVerse"
          label="Email us"
        />
      </p>
    </article>
  );
}
