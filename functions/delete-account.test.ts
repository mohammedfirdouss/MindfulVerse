import { describe, expect, it } from "vitest";

import { handleDeleteAccount } from "./delete-account";
import type { DeleteDeps } from "./delete-account";

const URL_ = "https://fn.example/delete-account";

function deps(over: Partial<DeleteDeps> = {}) {
  const deleted: string[] = [];
  const d: DeleteDeps = {
    deleteUser: async (id) => {
      deleted.push(id);
    },
    userIdFor: async (token) => (token === "good-token" ? "user-1" : null),
    ...over,
  };
  return { d, deleted };
}

const post = (auth?: string) =>
  new Request(URL_, {
    headers: auth ? { Authorization: auth } : {},
    method: "POST",
  });

describe(handleDeleteAccount, () => {
  it("deletes only the account behind the caller's own token", async () => {
    const { d, deleted } = deps();
    const res = await handleDeleteAccount(post("Bearer good-token"), d);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toStrictEqual({ deleted: true });
    expect(deleted).toStrictEqual(["user-1"]);
  });

  it("refuses without a token, with a bad token, or when the check fails", async () => {
    for (const auth of [undefined, "Basic abc", "Bearer bad-token"]) {
      const { d, deleted } = deps();
      const res = await handleDeleteAccount(post(auth), d);
      expect(res.status).toBe(401);
      expect(deleted).toStrictEqual([]);
    }
    const { d, deleted } = deps({
      userIdFor: () => Promise.reject(new Error("down")),
    });
    expect(
      (await handleDeleteAccount(post("Bearer good-token"), d)).status
    ).toBe(401);
    expect(deleted).toStrictEqual([]);
  });

  it("says so when the delete fails", async () => {
    const { d } = deps({
      deleteUser: () => Promise.reject(new Error("refused")),
    });
    const res = await handleDeleteAccount(post("Bearer good-token"), d);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("delete_failed");
  });

  it("only accepts POST, and answers the browser's preflight", async () => {
    const { d, deleted } = deps();
    const get = await handleDeleteAccount(
      new Request(URL_, { headers: { Authorization: "Bearer good-token" } }),
      d
    );
    expect(get.status).toBe(405);
    const pre = await handleDeleteAccount(
      new Request(URL_, { method: "OPTIONS" }),
      d
    );
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization"
    );
    expect(deleted).toStrictEqual([]);
  });
});
