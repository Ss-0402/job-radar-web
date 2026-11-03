import OpenAI from "openai";
import { extractSkills } from "@/lib/match/skills";

/**
 * JD → 结构化要求。优先调模型，失败回退规则。
 * key 缺失、超时、返回非法 JSON 都走回退，不抛异常给调用方。
 */

export type JdProfile = {
  title: string;
  years: string;
  degree: string;
  /** 硬性要求：不满足就进不了面试的那类 */
  skills: string[];
  /** 加分项：工具链、特定云厂商、IDE 插件这类「会用更好」 */
  bonusSkills: string[];
  highlights: string[];
  source: "llm" | "rules";
};

const MODEL = "deepseek-chat";
const MAX_JD_CHARS = 6000;

function client(): OpenAI | null {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" });
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function jdFromRules(jdText: string): JdProfile {
  const years = /(\d+\s*[-–~]\s*\d+\s*年|\d+\s*年以上|应届)/.exec(jdText)?.[0] ?? "";
  const degree = /(大专|本科|硕士|博士)/.exec(jdText)?.[0] ?? "";

  return {
    title: "",
    years,
    degree,
    skills: extractSkills(jdText),
    bonusSkills: [],
    highlights: [],
    source: "rules",
  };
}

export async function analyzeJd(jdText: string): Promise<JdProfile> {
  const c = client();
  if (!c) return jdFromRules(jdText);

  try {
    const res = await c.chat.completions.create(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是招聘 JD 解析器。只输出 JSON，不要解释。字段：" +
              "title（岗位名称，字符串）、years（经验要求，如 \"3-5 年\"，未知填空串）、" +
              "degree（学历要求，未知填空串）、" +
              "skills（硬性技能要求数组，每项 1-4 个词：不满足就进不了面试的那类，如语言、框架、数据库、领域经验）、" +
              "bonus（加分项数组，每项 1-4 个词：工具链、IDE 插件、特定云厂商、AI 编程工具、非必需但写「优先」的东西）、" +
              "highlights（3 条职责要点，每条不超过 20 字）。" +
              "同一个词只能出现在 skills 或 bonus 其中一处。" +
              "两项都只写技术/工具/能力名，不要写整句。",
          },
          { role: "user", content: jdText.slice(0, MAX_JD_CHARS) },
        ],
      },
      { timeout: 25_000 },
    );

    const raw = res.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const skills = asStringArray(parsed.skills);

    if (skills.length === 0) return jdFromRules(jdText);

    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      years: typeof parsed.years === "string" ? parsed.years : "",
      degree: typeof parsed.degree === "string" ? parsed.degree : "",
      skills,
      bonusSkills: asStringArray(parsed.bonus).filter(
        (b) => !skills.some((s) => s.toLowerCase() === b.toLowerCase()),
      ),
      highlights: asStringArray(parsed.highlights).slice(0, 3),
      source: "llm",
    };
  } catch {
    return jdFromRules(jdText);
  }
}
