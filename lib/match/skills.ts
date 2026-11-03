import jobs from "../../data/jobs.json";
import { CATALOG } from "./catalog";

/**
 * 技能词表与抽取。
 *
 * 词表 = 示例岗位派生词 ∪ 手写通用词表（catalog.ts）。
 * 只用示例池会在简历里漏掉 Git、Vue、MyBatis 这类常见写法；
 * 只用通用词表又会漏掉示例池里的业务词（数仓建模、用户增长）。
 *
 * 匹配规则：中文子串，英文整词。整词是必须的——否则 Java 会命中
 * JavaScript、Git 会命中 GitHub、SQL 会命中 MySQL。
 */

type Job = { skills: string[] };

export const SKILL_VOCAB: string[] = Array.from(
  new Set([...(jobs as Job[]).flatMap((j) => j.skills), ...CATALOG]),
).sort();

/** 常见别名 → 词表里的标准写法 */
const ALIASES: Record<string, string> = {
  k8s: "Kubernetes",
  springboot: "Spring Boot",
  "spring-boot": "Spring Boot",
  springcloud: "Spring Cloud",
  "spring-cloud": "Spring Cloud",
  postgres: "PostgreSQL",
  nodejs: "Node.js",
  nextjs: "Next.js",
  ts: "TypeScript",
  js: "JavaScript",
  py: "Python",
  torch: "PyTorch",
  llm: "大模型",
  vuejs: "Vue",
  reactjs: "React",
  es: "Elasticsearch",
  "prompt": "Prompt 工程",
};

/** 长词优先，避免 "C" 把 "C++" 吃掉这类问题 */
const SORTED_VOCAB = [...SKILL_VOCAB].sort((a, b) => b.length - a.length);

/** 短且易歧义的词按大小写匹配：C 语言 vs 小写 c，Go 语言 vs go to */
const CASE_SENSITIVE = new Set(["c", "c++", "c#", "go", "r"]);

const HAS_CJK = /[\u4e00-\u9fa5]/;

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 英文技能的整词正则，匹配和计数共用一套规则，避免两边不一致 */
function englishRe(skill: string, flags: string): RegExp {
  // 大小写敏感的词（C/Go）保留原样，避免把日文里的 c、句子里的 go 当技能
  const sensitive = CASE_SENSITIVE.has(skill.toLowerCase());
  const target = sensitive ? skill : skill.toLowerCase();
  return new RegExp(
    `(?<![a-z0-9+#])${escapeRe(target)}(?![a-z0-9+#])`,
    sensitive ? flags.replace("i", "") : `${flags}i`,
  );
}

function matchesSkill(text: string, skill: string): boolean {
  // 中文：子串即可（「微服务」命中「微服务架构」）
  if (HAS_CJK.test(skill)) return text.toLowerCase().includes(skill.toLowerCase());

  // 英文：整词，前后不能紧跟字母/数字/+/#
  return englishRe(skill, "").test(text);
}

export function extractSkills(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();

  for (const skill of SORTED_VOCAB) {
    if (matchesSkill(text, skill)) found.add(skill);
  }

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (SKILL_VOCAB.includes(canonical) && matchesSkill(text, alias)) {
      found.add(canonical);
    }
  }

  // 词表里既有 "Prompt" 又有 "Prompt 工程"（前者来自岗位池），同时命中时留长的
  const list = [...found];
  return list
    .filter((s) => !list.some((other) => other !== s && other.startsWith(s) && /^[\s\u4e00-\u9fa5]/.test(other.slice(s.length))))
    .sort();
}

/** 某个技能在文本里出现了几次，用于给缺口排优先级 */
export function countMentions(text: string, skill: string): number {
  if (!text) return 0;
  if (HAS_CJK.test(skill)) return text.split(skill).length - 1;
  return (text.match(englishRe(skill, "g")) ?? []).length;
}
