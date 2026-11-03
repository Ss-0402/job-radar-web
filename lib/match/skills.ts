import jobs from "../../data/jobs.json";

/**
 * 技能词表与抽取。
 *
 * 词表直接从示例岗位数据里派生，保证"能匹配上"和"能抽出来"用的是同一套词，
 * 不会出现「岗位要求 Kubernetes，但简历里写 k8s 就抽不到」这种假阴性。
 * 同义词表暂时手写，后续可以改成从数据里统计。
 */

type Job = { skills: string[] };

export const SKILL_VOCAB: string[] = Array.from(
  new Set((jobs as Job[]).flatMap((j) => j.skills)),
).sort();

/** 常见别名 → 词表里的标准写法 */
const ALIASES: Record<string, string> = {
  k8s: "Kubernetes",
  "springboot": "Spring Boot",
  "spring-boot": "Spring Boot",
  postgres: "PostgreSQL",
  "node": "Node.js",
  nodejs: "Node.js",
  ts: "TypeScript",
  js: "JavaScript",
  py: "Python",
  "pytorch": "PyTorch",
  torch: "PyTorch",
  "llm": "大模型",
};

/** 长词优先，避免 "C" 把 "C++" 吃掉这类问题 */
const SORTED_VOCAB = [...SKILL_VOCAB].sort((a, b) => b.length - a.length);

/** 短技能（C、Go、R 这类）必须整词命中，否则 "LangChain" 里的 c 会被当成 C */
const SHORT_SKILL_MAX = 3;

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesSkill(lowerText: string, skill: string): boolean {
  const target = skill.toLowerCase();
  if (skill.length > SHORT_SKILL_MAX) {
    return lowerText.includes(target);
  }
  // 前后不能紧跟字母/数字/+/#，避免 C 命中 LangChain、Go 命中 Google
  const re = new RegExp(`(?<![a-z0-9+#])${escapeRe(target)}(?![a-z0-9+#])`, "i");
  return re.test(lowerText);
}

export function extractSkills(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of SORTED_VOCAB) {
    if (matchesSkill(lower, skill)) found.add(skill);
  }

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (SKILL_VOCAB.includes(canonical) && matchesSkill(lower, alias)) {
      found.add(canonical);
    }
  }

  return [...found].sort();
}
