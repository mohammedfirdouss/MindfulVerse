import { insforge } from "./insforge";

/** Asks the server to delete the signed-in account itself (its email and
 *  sign-in), after the app has deleted the synced data. The server checks the
 *  caller's own access token, so this can only ever delete your own account.
 *  Returns false when it couldn't. */
export async function deleteAccount(): Promise<boolean> {
  try {
    const { error } = await insforge.functions.invoke("delete-account", {
      method: "POST",
    });
    return !error;
  } catch {
    return false;
  }
}
