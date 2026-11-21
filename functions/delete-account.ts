// delete-account: deletes the signed-in caller's own account. The caller is
// identified only by their access token; the admin key that deletes the
// account never leaves the server. Deleting the account removes the journal,
// progress, reminders and circles tied to it through ON DELETE CASCADE.
import { jsonError } from "./daily-verse";

export interface DeleteDeps {
  /** The user id behind this access token, or null when it is not valid. */
  userIdFor: (accessToken: string) => Promise<string | null>;
  /** Deletes the account. Throws when the server refuses. */
  deleteUser: (userId: string) => Promise<void>;
}

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_UNAUTHORIZED = 401;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_SERVER_ERROR = 500;
const BEARER_PATTERN = /^Bearer\s+(?<token>\S+)$/u;

// No cookies are involved: only a request that carries the user's own token
// can delete anything, so any origin may call this.
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const withCors = (res: Response): Response => {
  for (const [name, value] of Object.entries(corsHeaders)) {
    res.headers.set(name, value);
  }
  return res;
};

export const handleDeleteAccount = async (
  req: Request,
  deps: DeleteDeps
): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: HTTP_NO_CONTENT,
    });
  }
  if (req.method !== "POST") {
    return withCors(
      jsonError(HTTP_METHOD_NOT_ALLOWED, "method_not_allowed", "Use POST.")
    );
  }
  const token = BEARER_PATTERN.exec(req.headers.get("Authorization") ?? "")
    ?.groups?.token;
  if (!token) {
    return withCors(
      jsonError(
        HTTP_UNAUTHORIZED,
        "not_signed_in",
        "Sign in to delete your account."
      )
    );
  }
  let userId: string | null;
  try {
    userId = await deps.userIdFor(token);
  } catch {
    userId = null;
  }
  if (!userId) {
    return withCors(
      jsonError(
        HTTP_UNAUTHORIZED,
        "not_signed_in",
        "Sign in to delete your account."
      )
    );
  }
  try {
    await deps.deleteUser(userId);
  } catch {
    return withCors(
      jsonError(
        HTTP_SERVER_ERROR,
        "delete_failed",
        "Couldn't delete the account. Try again shortly."
      )
    );
  }
  return withCors(Response.json({ deleted: true }, { status: HTTP_OK }));
};

export default async function handler(req: Request): Promise<Response> {
  const base = (Deno.env.get("INSFORGE_BASE_URL") ?? "").replace(/\/+$/u, "");
  const apiKey = Deno.env.get("API_KEY") ?? "";
  return await handleDeleteAccount(req, {
    deleteUser: async (userId) => {
      const res = await fetch(`${base}/api/auth/users`, {
        body: JSON.stringify({ userIds: [userId] }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`delete failed: ${res.status}`);
      }
    },
    userIdFor: async (accessToken) => {
      const res = await fetch(`${base}/api/auth/sessions/current`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        return null;
      }
      const body = (await res.json()) as { user?: { id?: unknown } };
      return typeof body.user?.id === "string" ? body.user.id : null;
    },
  });
}
