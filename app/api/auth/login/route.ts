import { NextResponse } from "next/server";
import { badRequest, fail, readJson } from "@/lib/http";
import { authenticate } from "@/lib/auth/users";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";

type Body = { username?: string; password?: string };

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body) return badRequest("请求格式不对");

  const result = authenticate(body.username ?? "", body.password ?? "");
  if (!result.ok) return fail(result.status, "login_failed", result.message);

  const res = NextResponse.json({ user: result.data });
  res.cookies.set(SESSION_COOKIE, signSession(result.data.username), sessionCookieOptions(req));
  return res;
}
