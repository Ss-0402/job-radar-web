/**
 * 简历技能 vs 岗位要求。
 *
 * 只做集合运算 + 顺序信息，不做加权打分——权重那套在数据量足够之前
 * 只是给"看起来专业"服务，反而误导。缺口顺序沿用岗位要求里的出现顺序。
 */

export type MatchResult = {
  matched: string[];
  missing: string[];
  total: number;
  ratio: number;
};

function key(s: string): string {
  return s.trim().toLowerCase();
}

export function matchSkills(required: string[], mine: string[]): MatchResult {
  const mineSet = new Set(mine.map(key));
  const seen = new Set<string>();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of required) {
    const k = key(skill);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    (mineSet.has(k) ? matched : missing).push(skill.trim());
  }

  const total = matched.length + missing.length;
  return {
    matched,
    missing,
    total,
    ratio: total === 0 ? 0 : matched.length / total,
  };
}
