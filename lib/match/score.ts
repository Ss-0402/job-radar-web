import jobs from "../../data/jobs.json";
import { countMentions } from "./skills";

/**
 * 简历技能 vs 岗位要求。
 *
 * 分两档：必备（JD 里的硬要求）与加分（工具链、特定云厂商、IDE 插件这类）。
 * 之前把两档混在一起算百分比，一条堆满技术栈的 JD 能把匹配度压到 15%，
 * 数字吓人但没有信息量——分母里一半是「Cursor 会用更好」这种词。
 *
 * 缺口不再只按 JD 出现顺序排，而是按「JD 里提了几次 + 市场有多常见」排序，
 * 这样「先补哪个」才有依据。排序规则写在 UI 上，不做加权黑箱。
 */

export type MatchResult = {
  matched: string[];
  missing: string[];
  total: number;
  ratio: number;
  bonusMatched: string[];
  bonusMissing: string[];
  bonusTotal: number;
  /** 建议先补的三项（从必备缺口里挑） */
  priority: string[];
};

type Job = { skills: string[] };

/** 市场常见度：示例池里有多少岗位提到过它 */
const MARKET: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const job of jobs as Job[]) {
    for (const skill of job.skills) {
      const k = normalize(skill);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  }
  return map;
})();

/**
 * 统一写法，避免「Vue.js / Vue」「Node.js / NodeJS」对不上。
 * 去空白与标点，再去掉结尾的 js——vuejs→vue、nodejs→node，两边一致。
 */
export function normalize(skill: string): string {
  let k = skill.trim().toLowerCase().replace(/[\s._\-/·]+/g, "");
  if (k.length > 3 && k.endsWith("js")) k = k.slice(0, -2);
  return k;
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const skill of list) {
    const k = normalize(skill);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(skill.trim());
  }
  return out;
}

/** 补这一项的收益：JD 提得越多、市场上越常见，越该先补 */
function urgency(skill: string, jdText: string): number {
  return countMentions(jdText, skill) * 2 + (MARKET.get(normalize(skill)) ?? 0);
}

export function matchSkills(
  required: string[],
  mine: string[],
  opts: { bonus?: string[]; jdText?: string } = {},
): MatchResult {
  const jdText = opts.jdText ?? "";
  const mineSet = new Set(mine.map(normalize));
  const requiredKeys = new Set(dedupe(required).map(normalize));

  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of dedupe(required)) {
    (mineSet.has(normalize(skill)) ? matched : missing).push(skill);
  }

  // 加分项里如果已经在必备项出现过，不重复展示
  const bonusMatched: string[] = [];
  const bonusMissing: string[] = [];
  for (const skill of dedupe(opts.bonus ?? [])) {
    if (requiredKeys.has(normalize(skill))) continue;
    (mineSet.has(normalize(skill)) ? bonusMatched : bonusMissing).push(skill);
  }

  const ranked = [...missing].sort(
    (a, b) => urgency(b, jdText) - urgency(a, jdText),
  );

  const total = matched.length + missing.length;
  return {
    matched,
    missing: ranked,
    total,
    ratio: total === 0 ? 0 : matched.length / total,
    bonusMatched,
    bonusMissing,
    bonusTotal: bonusMatched.length + bonusMissing.length,
    priority: ranked.slice(0, 3),
  };
}
