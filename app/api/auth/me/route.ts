import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { findUser } from "@/lib/auth/users";
import { FREE_PER_DAY, remaining } from "@/lib/quota";

export async function GET() {
  const jar = await cookies();
  const username = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!username) return fail(401, "unauthorized", "请先登录");

  const user = findUser(username);
  if (!user) return fail(401, "unauthorized", "请先登录");

  return NextResponse.json({
    user,
    quota: { remaining: remaining(user.username), limit: FREE_PER_DAY },
  });
}
