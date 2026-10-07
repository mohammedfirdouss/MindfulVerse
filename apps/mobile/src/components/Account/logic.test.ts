import { describe, expect, it } from "vitest";
import {
  feedbackMailto,
  formatTime,
  normalizeOtp,
  notificationsBlocked,
  parseTime,
  shiftTime,
  spokenTime,
  toTime,
  validateCredentials,
  validateOtp,
} from "./logic";

describe("validateCredentials", () => {
  it("requires an email", () => {
    expect(validateCredentials("  ", "pw")).toBe("Enter your email.");
  });
  it("rejects an obviously malformed email", () => {
    expect(validateCredentials("me@home", "pw")).toMatch(/doesn't look right/);
    expect(validateCredentials("me home@x.io", "pw")).toMatch(/doesn't look right/);
  });
  it("requires a password", () => {
    expect(validateCredentials("me@example.com", "")).toBe("Enter your password.");
  });
  it("accepts a plausible pair, trimming the email", () => {
    expect(validateCredentials(" me@example.com ", "secret")).toBeNull();
  });
});

describe("OTP", () => {
  it("keeps digits only, up to six", () => {
    expect(normalizeOtp("12 34-56")).toBe("123456");
    expect(normalizeOtp("1234567")).toBe("123456");
    expect(normalizeOtp("abc")).toBe("");
  });
  it("needs exactly six digits", () => {
    expect(validateOtp("123456")).toBeNull();
    expect(validateOtp("12345")).toMatch(/6-digit/);
    expect(validateOtp("")).toMatch(/6-digit/);
  });
});

describe("time arithmetic", () => {
  it("parses HH:MM and rejects junk", () => {
    expect(parseTime("07:00")).toBe(420);
    expect(parseTime("7:05")).toBe(425);
    expect(parseTime("23:59")).toBe(1439);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("noon")).toBeNull();
  });
  it("formats minutes, wrapping into one day", () => {
    expect(toTime(420)).toBe("07:00");
    expect(toTime(-15)).toBe("23:45");
    expect(toTime(1440 + 30)).toBe("00:30");
  });
  it("steps by 15 minutes and an hour, wrapping midnight", () => {
    expect(shiftTime("07:00", 15)).toBe("07:15");
    expect(shiftTime("07:00", -15)).toBe("06:45");
    expect(shiftTime("23:45", 15)).toBe("00:00");
    expect(shiftTime("00:00", -15)).toBe("23:45");
    expect(shiftTime("23:30", 60)).toBe("00:30");
    expect(shiftTime("00:30", -60)).toBe("23:30");
  });
  it("snaps an off-grid time to the next slot on a 15-minute step", () => {
    expect(shiftTime("07:10", 15)).toBe("07:15");
    expect(shiftTime("07:10", -15)).toBe("07:00");
    expect(shiftTime("07:10", 60)).toBe("08:10");
  });
  it("falls back to the default for a malformed time", () => {
    expect(shiftTime("bogus", 15)).toBe("07:00");
  });
  it("displays 12-hour time", () => {
    expect(formatTime("07:00")).toBe("7:00 AM");
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("21:45")).toBe("9:45 PM");
    expect(formatTime("junk")).toBe("junk");
  });
  it("speaks noon and midnight plainly", () => {
    expect(spokenTime("00:00")).toBe("midnight");
    expect(spokenTime("12:00")).toBe("noon");
    expect(spokenTime("07:30")).toBe("7:30 AM");
  });
});

describe("notificationsBlocked", () => {
  it("is blocked only when denied and the OS won't ask again", () => {
    expect(notificationsBlocked({ status: "denied", canAskAgain: false })).toBe(true);
    expect(notificationsBlocked({ status: "denied", canAskAgain: true })).toBe(false);
    expect(notificationsBlocked({ status: "undetermined", canAskAgain: true })).toBe(false);
    expect(notificationsBlocked({ status: "granted", canAskAgain: false })).toBe(false);
    expect(notificationsBlocked(null)).toBe(false);
  });
});

describe("feedbackMailto", () => {
  it("matches web's FeedbackLink", () => {
    const href = feedbackMailto("About my MindfulVerse account");
    expect(href.startsWith("mailto:mohammedfirdous682@gmail.com?subject=About%20my%20MindfulVerse%20account&body="))
      .toBe(true);
    expect(decodeURIComponent(href.split("body=")[1])).toBe("Salaam alaykum warahmatullah wabarakatuh!\n\n");
  });
});
