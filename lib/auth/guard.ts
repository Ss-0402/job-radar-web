import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";
import { findUser, type PublicUser } from "./users";

/** 在 Route Handler / Server Component 里取当前登录用户，未登录返回 null。 */
export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const username = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!username) return null;
  return findUser(username);
}
