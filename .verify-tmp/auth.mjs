import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:4317";
const API = "574zppe8.us-east.insforge.app";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256" })}.${b64({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const user = {
  id: "u1",
  email: "fake@example.test",
  profile: { name: "Fake Person" },
};

async function run(
  name,
  {
    cookie,
    owner,
    url = "/account",
    pkce,
    refreshOk = false,
    exchangeDelay = 300,
  }
) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const log = [];
  await ctx.route(`https://${API}/**`, async (route) => {
    const u = new URL(route.request().url());
    log.push(`${route.request().method()} ${u.pathname}`);
    if (u.pathname === "/api/auth/oauth/exchange") {
      await new Promise((r) => setTimeout(r, exchangeDelay));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": BASE,
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify({ accessToken: jwt, user, csrfToken: "csrf1" }),
      });
    }
    if (u.pathname === "/api/auth/refresh") {
      return route.fulfill(
        refreshOk
          ? {
              status: 200,
              contentType: "application/json",
              headers: {
                "access-control-allow-origin": BASE,
                "access-control-allow-credentials": "true",
              },
              body: JSON.stringify({
                accessToken: jwt,
                user,
                csrfToken: "csrf2",
              }),
            }
          : {
              status: 401,
              contentType: "application/json",
              headers: {
                "access-control-allow-origin": BASE,
                "access-control-allow-credentials": "true",
              },
              body: JSON.stringify({
                error: "x",
                message: "no",
                statusCode: 401,
              }),
            }
      );
    }
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": BASE,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": BASE,
        "access-control-allow-credentials": "true",
      },
      body: "[]",
    });
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/privacy`);
  await page.evaluate(
    ({ cookie, owner, pkce }) => {
      localStorage.clear();
      if (cookie) {
        document.cookie = cookie;
      }
      if (owner) {
        localStorage.setItem("mindfulverse.sync.owner.v1", owner);
      }
      if (pkce) {
        sessionStorage.setItem("insforge_pkce_verifier", pkce);
      }
    },
    { cookie, owner, pkce }
  );
  log.length = 0;
  await page.goto(`${BASE}${url}`);
  await page.waitForTimeout(3000);
  const body = await page.locator("body").textContent();
  const signedIn =
    body.includes("fake@example.test") || body.includes("Fake Person");
  console.log(
    `${name}: signedIn=${signedIn} url=${page.url()} requests=${JSON.stringify(log.filter((l) => l.includes("/auth/")))}`
  );
  await browser.close();
}

await run("never signed in", {});
await run("never signed in, other cookies", { cookie: "theme=dark" });
await run("csrf cookie present (returning signed-in user)", {
  cookie: "insforge_csrf_token=abc",
  refreshOk: true,
});
await run("sync owner only (legacy user, csrf expired)", {
  owner: "u1",
  refreshOk: true,
});
await run("OAuth return, first sign-in on device", {
  url: "/account?insforge_code=code123",
  pkce: "verifier123",
});
await run("OAuth return, first sign-in, Home", {
  url: "/?insforge_code=code123",
  pkce: "verifier123",
});
