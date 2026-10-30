import { Component } from "react";
import type { ReactNode } from "react";

// If anything throws, show a calm recovery screen instead of a white page.
// A tester who hits a blank screen never comes back — and never tells us.
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            fontFamily: "var(--font-read)",
            margin: "0 auto",
            maxWidth: 560,
            padding: "80px 22px",
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "var(--indigo-deep)" }}>Something went wrong</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            A part of the app stumbled. Reloading usually sets it right.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
