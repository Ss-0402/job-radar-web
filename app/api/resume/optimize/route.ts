import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/guard";
import { optimizeResume } from "@/lib/llm/resume";
import { FREE_PER_DAY, consume, remaining } from "@/lib/quota";

/**
 * POST /api/resume/optimize
 *
 * 入参：{ resumeText, jdText, missing? }
 * 出参：{ advice: { gaps, rewrites, keywords }, quota, usedLlm }
 *
 * 额度：真的拿到模型结果才扣 1 次。失败（模型超时、返回空、没配 key）
 * 一律不扣，用户可以直接重试。
 */

const MIN_RESUME = 60;
const MIN_JD = 20;
const MAX_RESUME = 20000;
const MAX_JD = 8000;

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

  let body: { resumeText?: string; jdText?: string; missing?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "请求格式不对" } },
      { status: 400 },
    );
  }

  const resumeText = (body.resumeText ?? "").trim().slice(0, MAX_RESUME);
  const jdText = (body.jdText ?? "").trim().slice(0, MAX_JD);

  if (resumeText.length < MIN_RESUME) {
    return NextResponse.json(
      {
        error: {
          code: "resume_too_short",
          message: "简历内容太短，先贴一段完整经历再让 AI 帮你改",
        },
      },
      { status: 422 },
    );
  }
  if (jdText.length < MIN_JD) {
    return NextResponse.json(
      { error: { code: "jd_too_short", message: "先贴一段 JD，才知道往哪个方向改" } },
      { status: 422 },
    );
  }

  if (remaining(user.username) <= 0) {
    return NextResponse.json(
      {
        error: {
          code: "quota_exhausted",
          message: `今天的 ${FREE_PER_DAY} 次 AI 额度用完了，明天再来`,
        },
        quota: {
          remaining: 0,
          limit: FREE_PER_DAY,
          retryAfter: secondsUntilTomorrow(),
        },
      },
      { status: 429 },
    );
  }

  const missing = Array.isArray(body.missing)
    ? body.missing.filter((m): m is string => typeof m === "string")
    : [];

  const advice = await optimizeResume({ resumeText, jdText, missing });

  if (!advice) {
    return NextResponse.json(
      {
        error: {
          code: "llm_failed",
          message: "模型这次没给出可用结果，稍后再试（没有扣额度）",
        },
      },
      { status: 502 },
    );
  }

  // 拿到结果再扣；并发下扣失败也不回滚结果，宁可多给一次
  consume(user.username);

  return NextResponse.json({
    advice,
    usedLlm: true,
    quota: {
      remaining: remaining(user.username),
      limit: FREE_PER_DAY,
      retryAfter: secondsUntilTomorrow(),
    },
  });
}
