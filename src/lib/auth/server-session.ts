import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "./session";

const SESSION_COOKIE = "trefolio_session";

/**
 * Read and verify the session from cookies in a Server Component.
 * Returns null if no valid session exists.
 */
export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
