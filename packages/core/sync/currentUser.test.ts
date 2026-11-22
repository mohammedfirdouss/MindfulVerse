import { describe, expect, it } from "vitest";

import { mightHaveSession } from "./currentUser";

const none = { cookie: "", inProgress: false, syncOwner: null };

describe(mightHaveSession, () => {
  it("skips the server for a device that never signed in", () => {
    expect(mightHaveSession(none)).toBeFalsy();
    expect(
      mightHaveSession({
        ...none,
        cookie: "theme=dark; other=1",
      })
    ).toBeFalsy();
  });

  it("asks the server when the SDK's CSRF cookie is there", () => {
    expect(
      mightHaveSession({ ...none, cookie: "a=1; insforge_csrf_token=abc" })
    ).toBeTruthy();
  });

  it("asks the server when this device has synced before", () => {
    expect(mightHaveSession({ ...none, syncOwner: "user-1" })).toBeTruthy();
  });

  it("asks the server on a Google return or after signing in in this tab", () => {
    expect(mightHaveSession({ ...none, inProgress: true })).toBeTruthy();
  });
});
