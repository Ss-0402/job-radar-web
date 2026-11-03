"use client";

import { useRef, useState } from "react";

type ParseResponse = { text: string; chars: number; ext: string; skills: string[] };

type JdProfile = {
  title: string;
  years: string;
  degree: string;
  skills: string[];
  highlights: string[];
  source: "llm" | "rules";
};

type Match = {
  matched: string[];
  missing: string[];
  total: number;
  ratio: number;
};

type AnalyzeResponse = {
  profile: JdProfile;
  match: Match;
  mySkills: string[];
  usedLlm: boolean;
  quota: { remaining: number; limit: number; retryAfter: number };
};

type ApiError = { error?: { message?: string } };

export function Analyzer({ remaining, limit }: { remaining: number; limit: number }) {
  const [resumeText, setResumeText] = useState("");
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [left, setLeft] = useState(remaining);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"resume" | "jd" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function parseResume(text?: string, file?: File) {
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
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: text ?? resumeText }),
          });

      const data = (await res.json()) as ParseResponse & ApiError;
      if (!res.ok) {
        setError(data.error?.message ?? "简历解析失败");
        return;
      }
      setResumeText(data.text);
      setMySkills(data.skills);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function analyze() {
    if (jd.trim().length < 20) {
      setError("JD 太短了，至少贴一段完整描述");
      return;
    }
    setBusy("jd");
    setError(null);
    try {
      const res = await fetch("/api/jd/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdText: jd, resumeText }),
      });
      const data = (await res.json()) as AnalyzeResponse & ApiError;
      if (!res.ok) {
        setError(data.error?.message ?? "分析失败");
        return;
      }
      setResult(data);
      setLeft(data.quota.remaining);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setBusy(null);
    }
  }

  const m = result?.match;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 简历 */}
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">📄 我的简历</h2>
            <span className="text-xs text-ink-400">
              {mySkills.length > 0 ? `${mySkills.length} 项技能` : "还没解析"}
            </span>
          </header>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={7}
            placeholder="把技能、项目经历粘进来，或上传文件"
            className="mt-3 w-full resize-y rounded-xl border border-ink-200 px-3 py-2 text-sm leading-6 outline-none focus:border-accent-500"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => parseResume()}
              disabled={busy !== null}
              className="rounded-lg bg-ink-800 px-3 py-1.5 text-sm text-white transition hover:bg-ink-900 disabled:opacity-60"
            >
              {busy === "resume" ? "解析中…" : "解析简历"}
            </button>
            <label className="cursor-pointer rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 transition hover:bg-ink-50">
              上传文件
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.docx,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void parseResume(undefined, f);
                }}
              />
            </label>
            <span className="text-xs text-ink-400">txt / md / docx / pdf，≤5MB</span>
          </div>

          {mySkills.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {mySkills.map((s) => (
                <li key={s} className="rounded-md bg-ink-100 px-2 py-1 text-xs">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* JD */}
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">🎯 目标岗位 JD</h2>
            <span className="text-xs text-ink-400">
              今日剩余 {left} / {limit} 次
            </span>
          </header>

          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={7}
            placeholder="从招聘页面整段复制岗位描述贴进来"
            className="mt-3 w-full resize-y rounded-xl border border-ink-200 px-3 py-2 text-sm leading-6 outline-none focus:border-accent-500"
          />

          <div className="mt-3">
            <button
              type="button"
              onClick={analyze}
              disabled={busy !== null}
              className="rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-500 disabled:opacity-60"
            >
              {busy === "jd" ? "分析中…" : "分析匹配"}
            </button>
          </div>
        </section>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {result && m && (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {result.profile.title || "岗位画像"}
              {result.profile.years && (
                <span className="ml-2 text-xs font-normal text-ink-400">
                  {result.profile.years}
                </span>
              )}
              {result.profile.degree && (
                <span className="ml-1 text-xs font-normal text-ink-400">
                  · {result.profile.degree}
                </span>
              )}
            </h2>
            <span className="text-xs text-ink-400">
              {result.usedLlm ? "模型解析" : "规则解析（未消耗额度）"}
            </span>
          </header>

          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {m.matched.length} / {m.total} 项符合
            <span className="ml-2 text-sm font-normal text-ink-400">
              {Math.round(m.ratio * 100)}%
            </span>
          </p>

          {m.missing.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs text-ink-400">还缺（按 JD 里出现顺序）</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {m.missing.map((s) => (
                  <li
                    key={s}
                    className="rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-800"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm text-green-700">要求项都覆盖了。</p>
          )}

          {m.matched.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-ink-400">已具备</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {m.matched.map((s) => (
                  <li
                    key={s}
                    className="rounded-md bg-green-50 px-2 py-1 text-xs text-green-800"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.profile.highlights.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-ink-600">
              {result.profile.highlights.map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
