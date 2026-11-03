import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/guard";
import { extractSkills } from "@/lib/match/skills";
import { MAX_CHARS, parseResume } from "@/lib/parse/resume";

/**
 * POST /api/resume/parse
 *
 * 两种入参：
 * - multipart/form-data，字段名 file（上传 txt/md/docx/pdf）
 * - application/json，{ text: "..." }（直接粘贴）
 *
 * 出参：{ text, chars, skills, ext }
 * 不调用模型，纯规则；所以不消耗额度。
 */

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "请先登录" } },
      { status: 401 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";

  let text = "";
  let ext = "text";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: { code: "bad_request", message: "上传内容读不出来" } },
        { status: 400 },
      );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "没有收到文件" } },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseResume(file.name, bytes);

    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: "parse_failed", message: parsed.message } },
        { status: 422 },
      );
    }
    text = parsed.text;
    ext = parsed.ext;
  } else {
    let body: { text?: string };
    try {
      body = (await req.json()) as { text?: string };
    } catch {
      return NextResponse.json(
        { error: { code: "bad_request", message: "请求格式不对" } },
        { status: 400 },
      );
    }

    text = (body.text ?? "").trim();
    if (text.length < 10) {
      return NextResponse.json(
        { error: { code: "too_short", message: "内容太短，至少粘贴一段经历" } },
        { status: 422 },
      );
    }
    text = text.slice(0, MAX_CHARS);
  }

  return NextResponse.json({
    text,
    chars: text.length,
    ext,
    skills: extractSkills(text),
  });
}
