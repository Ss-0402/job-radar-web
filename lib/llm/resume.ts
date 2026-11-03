import OpenAI from "openai";

/**
 * 简历优化建议。
 *
 * 与分析不同，这里没有规则回退——「帮你改简历」如果改不出东西，就该明确报错，
 * 而不是返回一段模板话术冒充模型输出。调用方拿到 null 就提示「稍后再试，未扣额度」。
 *
 * 硬约束写进提示词：只基于简历里已有的事实改写，不许编造经历、学历、年限。
 * 这是这类功能最容易出事的地方，一旦编造，用户拿去投递会直接翻车。
 */

export type ResumeAdvice = {
  /** 针对缺口的具体动作 */
  gaps: { skill: string; why: string; how: string; snippet: string }[];
  /** 简历里某句话的改写版 */
  rewrites: { before: string; after: string }[];
  /** 简历没写、但 JD 反复要求的词 */
  keywords: string[];
};

const MODEL = "deepseek-chat";
const MAX_RESUME = 12000;
const MAX_JD = 4000;

function client(): OpenAI | null {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" });
}

function str(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function optimizeResume(input: {
  resumeText: string;
  jdText: string;
  missing?: string[];
}): Promise<ResumeAdvice | null> {
  const c = client();
  if (!c) return null;

  const missing = (input.missing ?? []).slice(0, 15).join("、");

  try {
    const res = await c.chat.completions.create(
      {
        model: MODEL,
        temperature: 0.3,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是资深技术招聘顾问，帮候选人针对某条 JD 改简历。只输出 JSON，不要解释。格式：" +
              '{"gaps":[{"skill":"缺口技能名","why":"为什么这条 JD 在意它，一句话",' +
              '"how":"补齐或体现的具体做法，一句话","snippet":"可以直接粘进简历的一句话，40 字以内"}],' +
              '"rewrites":[{"before":"简历原文里的一句话，必须原样摘录","after":"改写版，把 JD 关键词自然织进去"}],' +
              '"keywords":["简历里没出现但 JD 要求的词"]}。\n' +
              "硬规矩：" +
              "1) 只基于简历已有的事实改写，绝对不许编造公司、项目、学历、年限、数字指标；" +
              "2) 不许把简历里没有的技术、工具、组件写进 after 或 snippet——简历只写了 Flask，就不能改写成「接入了向量数据库」；" +
              "   只能换更清楚的表达、补上动作与结果，或把一个已有事实说具体；" +
              "3) 简历里没有的经历不要写「已具备」，gaps 里写清楚这是要补的；" +
              "4) snippet 和 after 用第一人称、可量化优先，没有真实数字就不要造数字；" +
              "5) gaps 最多 5 条，rewrites 最多 3 条，keywords 最多 8 个；" +
              "6) 全部用中文，技术名词保留英文原写法。",
          },
          {
            role: "user",
            content:
              `【目标岗位 JD】\n${input.jdText.slice(0, MAX_JD)}\n\n` +
              (missing ? `【已识别出的缺口】${missing}\n\n` : "") +
              `【我的简历】\n${input.resumeText.slice(0, MAX_RESUME)}`,
          },
        ],
      },
      { timeout: 30_000 },
    );

    const raw = res.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const gaps = Array.isArray(parsed.gaps)
      ? parsed.gaps
          .map((g) => g as Record<string, unknown>)
          .map((g) => ({
            skill: str(g.skill, 40),
            why: str(g.why, 120),
            how: str(g.how, 160),
            snippet: str(g.snippet, 120),
          }))
          .filter((g) => g.skill && g.how)
          .slice(0, 5)
      : [];

    const rewrites = Array.isArray(parsed.rewrites)
      ? parsed.rewrites
          .map((r) => r as Record<string, unknown>)
          .map((r) => ({ before: str(r.before, 200), after: str(r.after, 300) }))
          .filter((r) => r.before && r.after)
          .slice(0, 3)
      : [];

    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string")
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    // 三块全空等于没答，按失败处理，别让用户白花一次额度
    if (gaps.length === 0 && rewrites.length === 0 && keywords.length === 0) {
      return null;
    }

    return { gaps, rewrites, keywords };
  } catch {
    return null;
  }
}
