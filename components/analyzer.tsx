"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { countMentions } from "@/lib/match/skills";

/* ---------------------------------- 类型 ---------------------------------- */

type Profile = {
  title: string;
  years: string;
  degree: string;
  skills: string[];
  bonusSkills: string[];
  highlights: string[];
  source: "llm" | "rule";
};

type Match = {
  matched: string[];
  missing: string[];
  total: number;
  ratio: number;
  bonusMatched: string[];
  bonusMissing: string[];
  bonusTotal: number;
  priority: string[];
};

type Quota = { remaining: number; limit: number; retryAfter?: number };

type ParseResponse = { text: string; chars: number; ext: string; skills: string[] };
type AnalyzeResponse = {
  profile: Profile;
  match: Match;
  mySkills: string[];
  usedLlm: boolean;
  quota: Quota;
};
type AdviceGap = { skill: string; why: string; how: string; snippet: string };
type Advice = {
  gaps: AdviceGap[];
  rewrites: { before: string; after: string }[];
  keywords: string[];
};
type OptimizeResponse = { advice: Advice; usedLlm: boolean; quota: Quota };

/* --------------------------------- 小工具 --------------------------------- */

/** 按句号、分号、换行切开，用来找「这句话里有这个技能」 */
function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[。！？；;])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 在文本里找第一句提到该技能的原文；找不到返回 null */
function findEvidence(text: string, skill: string): string | null {
  if (!text) return null;
  for (const s of splitSentences(text)) {
    if (countMentions(s, skill) > 0) return s;
  }
  return null;
}

const BTN =
  "inline-flex items-center justify-center border px-3 py-1.5 text-ui transition-colors disabled:cursor-not-allowed disabled:opacity-45";
const BTN_LINE = `${BTN} border-ink-300 text-ink-700 hover:border-ink-900 hover:text-ink-900`;
const BTN_SOLID = `${BTN} border-ink-900 bg-ink-900 text-ink-50 hover:bg-ink-800`;
const FIELD =
  "w-full border border-ink-300 bg-white px-3 py-2 text-body text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900";

/* --------------------------------- 主组件 --------------------------------- */

export function Analyzer({
  remaining,
  limit,
  initialJd,
}: {
  remaining: number;
  limit: number;
  initialJd: string;
}) {
  const [resumeText, setResumeText] = useState("");
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [jd, setJd] = useState(initialJd);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [left, setLeft] = useState(remaining);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<"resume" | "jd" | "opt" | null>(null);
  const [sel, setSel] = useState(0);
  const [patched, setPatched] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  /* ------------------------------- 请求 ------------------------------- */

  const parseResume = useCallback(
    async (text?: string, file?: File) => {
      setBusy("resume");
      setError(null);
      try {
        const res = file
          ? await fetch("/api/resume/parse", {
              method: "POST",
              body: (() => {
                const form = new FormData();
                form.append("file", file);
                return form;
              })(),
            })
          : await fetch("/api/resume/parse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text }),
            });
        if (!res.ok) {
          const info = await res.json().catch(() => null);
          throw new Error(info?.error?.message ?? "简历解析失败，换一份试试");
        }
        const data = (await res.json()) as ParseResponse;
        setResumeText(data.text);
        setMySkills(data.skills);
      } catch (e) {
        setError(e instanceof Error ? e.message : "简历解析失败");
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const analyze = useCallback(async () => {
    if (!resumeText.trim()) {
      setError("还没有简历：上传文件或直接把简历文本粘进左边的框");
      return;
    }
    if (jd.trim().length < 20) {
      setError("JD 太短了，至少贴一段完整的岗位职责");
      return;
    }
    setBusy("jd");
    setError(null);
    try {
      const res = await fetch("/api/jd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: jd, resumeText }),
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(info?.error?.message ?? "分析失败，稍后再试");
      }
      const data = info as AnalyzeResponse;
      if (data.mySkills?.length) setMySkills(data.mySkills);
      setResult(data);
      setAdvice(null);
      setPatched(new Set());
      setSel(0);
      setLeft(data.quota.remaining);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败");
    } finally {
      setBusy(null);
    }
  }, [jd, resumeText]);

  const optimize = useCallback(async () => {
    if (!result) return;
    setBusy("opt");
    setError(null);
    try {
      const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText: jd,
          missing: result.match.missing,
        }),
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(info?.error?.message ?? "生成失败，额度没有扣");
      }
      const data = info as OptimizeResponse;
      setAdvice(data.advice);
      setLeft(data.quota.remaining);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(null);
    }
  }, [jd, resumeText, result]);

  async function copy(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  function reset() {
    setResult(null);
    setAdvice(null);
    setPatched(new Set());
    setError(null);
  }

  /* ------------------------------ 结论整理 ------------------------------ */

  const rows = useMemo(() => {
    if (!result) return [];
    return result.profile.skills.map((skill, i) => {
      const hit = result.match.matched.includes(skill);
      return {
        no: String(i + 1).padStart(2, "0"),
        skill,
        mention: countMentions(jd, skill),
        resume: findEvidence(resumeText, skill),
        hit,
      };
    });
  }, [result, jd, resumeText]);

  const gapRows = rows.filter((r) => !r.hit);
  const topThree = result
    ? result.match.priority.filter((s) => !result.match.matched.includes(s)).slice(0, 3)
    : [];
  const restGaps = gapRows.filter((r) => !topThree.includes(r.skill));
  const gapFor = useCallback(
    (skill: string) =>
      (advice?.gaps ?? []).find(
        (g) => g.skill.includes(skill) || skill.includes(g.skill.replace(/（.*?）/g, "").trim()),
      ),
    [advice],
  );

  /* ------------------------------ 键盘操作 ------------------------------ */

  function onTableKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!result) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      const skill = rows[sel]?.skill;
      if (!skill) return;
      setPatched((prev) => {
        const next = new Set(prev);
        if (next.has(skill)) next.delete(skill);
        else next.add(skill);
        return next;
      });
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAdvice(null);
    }
  }

  /* -------------------------------- 输入态 -------------------------------- */

  if (!result) {
    return (
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-page font-semibold">贴简历，贴 JD</h1>
          <p className="text-note text-ink-400">
            今日剩余 <span className="tnum text-ink-900">{left}</span> / {limit} 次
          </p>
        </div>

        <div className="mt-6 grid gap-px border border-ink-200 bg-ink-200 lg:grid-cols-2">
          <div className="bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sect font-semibold">我的简历</h2>
              <span className="text-note text-ink-400">
                {mySkills.length > 0 ? `已解析 ${mySkills.length} 项技能` : "txt / md / docx / pdf，≤5MB"}
              </span>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="把简历全文粘进来，或点下方「选择文件」上传。"
              className={`${FIELD} mt-3 min-h-[15rem]`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={BTN_LINE}
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
              >
                选择文件
              </button>
              <button
                type="button"
                className={BTN_LINE}
                onClick={() => parseResume(resumeText)}
                disabled={busy !== null || resumeText.trim().length === 0}
              >
                {busy === "resume" ? "解析中…" : "解析粘贴的文本"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.docx,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void parseResume(undefined, f);
                  e.target.value = "";
                }}
              />
            </div>
            {mySkills.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {mySkills.map((s) => (
                  <li
                    key={s}
                    className="border border-ink-200 px-2 py-0.5 text-note text-ink-700"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sect font-semibold">目标岗位 JD</h2>
              <span className="text-note text-ink-400">整段复制招聘页的岗位职责</span>
            </div>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="岗位职责、任职要求整段贴进来。"
              className={`${FIELD} mt-3 min-h-[15rem]`}
            />
            {initialJd && jd === initialJd && (
              <p className="mt-3 text-note text-ink-400">已载入示例岗位的 JD，可以直接分析。</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={analyze}
            disabled={busy !== null}
            className={`${BTN_SOLID} border-accent-500 bg-accent-500 px-5 py-2 hover:bg-accent-600`}
          >
            {busy === "jd" ? "分析中…" : "分析匹配"}
          </button>
          <p className="text-note text-ink-400">会消耗 1 次额度；失败不扣。</p>
          {error && <p className="text-note text-accent-600">{error}</p>}
        </div>
      </section>
    );
  }

  /* -------------------------------- 结论态 -------------------------------- */

  const { profile, match } = result;
  const meta = [profile.years, profile.degree].filter(Boolean).join(" · ");

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-page font-semibold">对照表</h1>
        <p className="text-note text-ink-400">
          {profile.title}
          {meta && <span className="text-ink-400"> · {meta}</span>}
        </p>
      </div>

      {/* 材料栏 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-ink-200 py-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-note text-ink-600">
          <span>
            简历 <span className="tnum text-ink-900">{resumeText.length}</span> 字 · 解析出{" "}
            <span className="tnum text-ink-900">{mySkills.length}</span> 项
          </span>
          <span className="text-ink-300">|</span>
          <span>
            JD <span className="tnum text-ink-900">{jd.length}</span> 字 · 拆出{" "}
            <span className="tnum text-ink-900">{match.total}</span> 条
          </span>
          <span className="text-ink-300">|</span>
          <span>{profile.source === "llm" ? "模型解析" : "规则解析"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className={BTN_SOLID}>
            重新分析
          </button>
          <button
            type="button"
            onClick={() => {
              setJd("");
              reset();
            }}
            className={BTN_LINE}
          >
            换一份 JD
          </button>
        </div>
      </div>

      {/* 摘要 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ui text-ink-600">
          <span className="tnum text-ink-900">{match.total}</span> 条要求 · 命中{" "}
          <span className="tnum text-ink-900">{match.matched.length}</span> · 缺口{" "}
          <span className="tnum font-semibold text-accent-600">{match.missing.length}</span>
        </p>
        <p className="hidden text-note text-ink-400 lg:block">
          ↑↓ 选行 · F 标记已补 · Esc 收起建议
        </p>
      </div>

      <div className="mt-3 grid items-start gap-x-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* 表 */}
        <div
          role="grid"
          tabIndex={0}
          onKeyDown={onTableKey}
          aria-label="JD 与简历逐条对照"
          className="border-t border-ink-300 outline-none"
        >
          <div className="grid grid-cols-[42px_minmax(0,1fr)_56px] gap-4 border-b border-ink-200 py-2 text-micro uppercase text-ink-400 sm:grid-cols-[42px_minmax(0,1.05fr)_minmax(0,1fr)_56px]">
            <span>#</span>
            <span>招聘要求</span>
            <span className="hidden sm:block">你的简历</span>
            <span className="text-right">判定</span>
          </div>

          {rows.map((r, i) => {
            const done = patched.has(r.skill);
            const active = i === sel;
            return (
              <div
                key={r.skill}
                onMouseEnter={() => setSel(i)}
                className={`grid cursor-default grid-cols-[42px_minmax(0,1fr)_56px] items-baseline gap-4 border-b border-ink-200 py-2.5 transition-colors sm:grid-cols-[42px_minmax(0,1.05fr)_minmax(0,1fr)_56px] ${
                  active ? "bg-ink-100" : ""
                } ${r.hit ? "border-l-2 border-l-transparent" : "border-l-2 border-l-accent-500"}`}
              >
                <span className={`tnum text-note ${done ? "text-ink-300" : "text-ink-400"}`}>
                  {r.no}
                </span>
                <span className={`min-w-0 text-ui ${done ? "text-ink-400" : "text-ink-900"}`}>
                  <span className={done ? "line-through decoration-ink-300" : ""}>{r.skill}</span>
                  {r.mention > 1 && (
                    <span className="tnum ml-2 text-note text-ink-400">JD 提到 {r.mention} 次</span>
                  )}
                  <span
                    className={`mt-0.5 block text-note leading-relaxed sm:hidden ${
                      r.resume ? "text-ink-600" : "text-ink-400"
                    }`}
                  >
                    {r.resume ?? "简历未提及"}
                  </span>
                </span>
                <span className="hidden min-w-0 text-ui text-ink-600 sm:block">
                  {r.resume ? (
                    <span className="line-clamp-2">{r.resume}</span>
                  ) : (
                    <span className="text-ink-400">简历未提及</span>
                  )}
                </span>
                <span className="text-right text-note">
                  {done ? (
                    <span className="text-ink-400">已补</span>
                  ) : r.hit ? (
                    <span className="text-ink-600">命中</span>
                  ) : (
                    <span className="text-accent-600">缺</span>
                  )}
                </span>
              </div>
            );
          })}

          <p className="mt-3 text-note text-ink-400">
            缺口按 JD 提及次数排序；「你的简历」列只引用你写过的原句，不做推断。
          </p>
        </div>

        {/* 右栏 */}
        <aside className="mt-6 lg:sticky lg:top-6 lg:mt-0">
          <h2 className="flex items-baseline justify-between border-b border-ink-200 pb-2 text-note text-ink-400">
            <span>先补这三个</span>
            <span>按 JD 提及次数</span>
          </h2>
          <ol className="mt-1">
            {topThree.map((skill, i) => {
              const row = rows.find((r) => r.skill === skill);
              const gap = gapFor(skill);
              return (
                <li key={skill} className="border-b border-ink-200 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="tnum mr-2 text-note text-ink-400">
                        0{i + 1}
                      </span>
                      <span className="text-ui font-semibold">{skill}</span>
                    </span>
                    <span className="tnum shrink-0 text-note text-accent-600">
                      JD 提到 {row?.mention ?? 1} 次
                    </span>
                  </div>
                  {gap && (
                    <p className="mt-1.5 text-note leading-relaxed text-ink-600">{gap.how}</p>
                  )}
                </li>
              );
            })}
          </ol>

          {!advice && (
            <p className="mt-2 text-note leading-relaxed text-ink-400">
              这三条在简历里都没有证据。点下面的按钮，AI 会针对每一条给出具体补法。
            </p>
          )}

          {restGaps.length > 0 && (
            <div className="mt-4">
              <h3 className="flex items-baseline justify-between border-b border-ink-200 pb-2 text-note text-ink-400">
                <span>其余缺口</span>
                <span className="tnum">{restGaps.length} 项</span>
              </h3>
              <ul className="mt-1">
                {restGaps.map((r) => (
                  <li
                    key={r.skill}
                    className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-1.5 text-note"
                  >
                    <span className="min-w-0 truncate text-ink-700">{r.skill}</span>
                    <span className="tnum shrink-0 text-ink-400">JD 提到 {r.mention} 次</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {match.bonusTotal > 0 && (
            <details className="mt-4 border-b border-ink-200 pb-3">
              <summary className="flex cursor-pointer items-baseline justify-between text-note text-ink-400">
                <span>加分项</span>
                <span className="tnum">
                  {match.bonusMatched.length} / {match.bonusTotal}
                </span>
              </summary>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[...match.bonusMatched.map((s) => ({ s, ok: true })), ...match.bonusMissing.map((s) => ({ s, ok: false }))].map(
                  (b) => (
                    <li
                      key={b.s}
                      className={`border px-1.5 py-0.5 text-note ${
                        b.ok
                          ? "border-ink-300 text-ink-700"
                          : "border-dashed border-ink-200 text-ink-400"
                      }`}
                    >
                      {b.s}
                    </li>
                  ),
                )}
              </ul>
            </details>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={optimize}
              disabled={busy !== null || left <= 0}
              className="w-full border border-accent-500 bg-white px-3 py-2 text-ui text-accent-600 transition-colors hover:bg-accent-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "opt" ? "生成中…" : advice ? "换一版改法" : "让 AI 帮我改简历"}
            </button>
            <p className="mt-2 text-note leading-relaxed text-ink-400">
              会消耗 1 次额度，基于这条 JD 给改法，不会编造经历。
              {left <= 0 && " 今日额度已用完，明天再来。"}
            </p>
            <p className="mt-1 text-note text-ink-400">
              今日剩余 <span className="tnum text-ink-700">{left}</span> / {limit} 次
            </p>
          </div>
        </aside>
      </div>

      {error && <p className="mt-4 text-note text-accent-600">{error}</p>}

      {/* 优化建议 */}
      {advice && (
        <section className="mt-10 border-t border-ink-300 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sect font-semibold">改简历</h2>
            <p className="text-note text-ink-400">只基于你写过的事实改写，不补不存在的经历</p>
          </div>

          {advice.gaps.length > 0 && (
            <div className="mt-4">
              <h3 className="text-note text-ink-400">怎么补这几项</h3>
              <ul className="mt-2 border-t border-ink-200">
                {advice.gaps.map((g, i) => (
                  <li key={`${g.skill}-${i}`} className="border-b border-ink-200 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-ui font-semibold text-ink-900">{g.skill}</span>
                      <span className="text-note text-ink-400">{g.why}</span>
                    </div>
                    <p className="mt-1 max-w-[62ch] text-ui leading-relaxed text-ink-700">
                      {g.how}
                    </p>
                    {g.snippet && (
                      <div className="mt-1.5 flex items-start justify-between gap-4">
                        <p className="max-w-[62ch] border-l-2 border-ink-200 pl-3 text-ui text-ink-600">
                          {g.snippet}
                        </p>
                        <button
                          type="button"
                          onClick={() => copy(g.snippet, `gap-${i}`)}
                          className="shrink-0 text-note text-ink-400 underline decoration-ink-300 underline-offset-4 hover:text-ink-900"
                        >
                          {copied === `gap-${i}` ? "已复制" : "复制"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advice.rewrites.length > 0 && (
            <div className="mt-4">
              <h3 className="text-note text-ink-400">句子改写</h3>
              <ul className="mt-2 border-t border-ink-200">
                {advice.rewrites.map((rw, i) => (
                  <li key={i} className="border-b border-ink-200 py-3">
                    <p className="max-w-[62ch] text-ui text-ink-400 line-through decoration-ink-300">
                      {rw.before}
                    </p>
                    <div className="mt-1 flex items-start justify-between gap-4">
                      <p className="max-w-[62ch] text-ui text-ink-900">{rw.after}</p>
                      <button
                        type="button"
                        onClick={() => copy(rw.after, `rw-${i}`)}
                        className="shrink-0 text-note text-ink-400 underline decoration-ink-300 underline-offset-4 hover:text-ink-900"
                      >
                        {copied === `rw-${i}` ? "已复制" : "复制"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advice.keywords.length > 0 && (
            <div className="mt-4">
              <h3 className="text-note text-ink-400">建议补进技能栏的词</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {advice.keywords.map((k) => (
                  <li key={k} className="border border-ink-300 px-2 py-0.5 text-note text-ink-700">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={() => copy(
                advice.rewrites.map((r) => r.after).join("\n"),
                "all",
              )}
              className={BTN_LINE}
            >
              {copied === "all" ? "已复制全部改写" : "复制全部改写"}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
