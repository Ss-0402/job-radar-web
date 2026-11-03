import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/guard";
import { analyzeJd, jdFromRules } from "@/lib/llm/jd";
import { matchSkills } from "@/lib/match/score";
import { extractSkills } from "@/lib/match/skills";
import { FREE_PER_DAY, consume, remaining } from "@/lib/quota";
import jobs from "../../../../data/jobs.json";

/**
 * POST /api/jd/analyze
 *
 * 入参：{ jdText } 或 { jobId }
 * 出参：{ profile, match, quota, usedLlm }
 *
 * 额度规则：只有真正调用了模型才扣 1 次；额度耗尽时自动退回规则抽取，
 * 结果仍可用，只是 skills 来自词表而不是模型。
 */

const MIN_JD_CHARS = 20;
const MAX_JD_CHARS = 8000;

type Job = { id: number; title: string; jd: string; skills: string[] };

function secondsUntilTomorrow(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "请先登录" } },
      { status: 401 },
    );
  }

  let body: { jdText?: string; jobId?: number; resumeText?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "请求格式不对" } },
      { status: 400 },
    );
  }

  let jdText = (body.jdText ?? "").trim();
  if (!jdText && typeof body.jobId === "number") {
    const job = (jobs as Job[]).find((j) => j.id === body.jobId);
    if (job) jdText = job.jd;
  }

  if (jdText.length < MIN_JD_CHARS) {
    return NextResponse.json(
      { error: { code: "jd_too_short", message: "JD 太短了，至少贴一段完整描述" } },
      { status: 422 },
    );
  }
  jdText = jdText.slice(0, MAX_JD_CHARS);

  const resumeText = (body.resumeText ?? "").slice(0, 20000);
  const mySkills = extractSkills(resumeText);

  const left = remaining(user.username);
  let profile;
  let usedLlm = false;

  if (left > 0) {
    profile = await analyzeJd(jdText);
    if (profile.source === "llm") {
      usedLlm = consume(user.username);
      if (!usedLlm) profile = jdFromRules(jdText);
    }
  } else {
    profile = jdFromRules(jdText);
  }

  const match = matchSkills(profile.skills, mySkills);

  return NextResponse.json({
    profile,
    match,
    mySkills,
    usedLlm,
    quota: {
      remaining: remaining(user.username),
      limit: FREE_PER_DAY,
      retryAfter: secondsUntilTomorrow(),
    },
  });
}
