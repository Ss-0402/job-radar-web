"use client";

import { useRef, useState } from "react";

type ParseResponse = {
  text: string;
  chars: number;
  ext: string;
  skills: string[];
};

type ApiError = { error?: { message?: string } };

export function ResumePanel() {
  const [text, setText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [chars, setChars] = useState(0);
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function apply(data: ParseResponse, label: string) {
    setText(data.text);
    setSkills(data.skills);
    setChars(data.chars);
    setSource(label);
    setError(null);
  }

  async function parseText() {
    if (!text.trim()) {
      setError("先粘贴一段简历内容");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as ParseResponse & ApiError;
      if (!res.ok) {
        setError(data.error?.message ?? "解析失败");
        return;
      }
      apply(data, "粘贴文本");
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function parseFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: form });
      const data = (await res.json()) as ParseResponse & ApiError;
      if (!res.ok) {
        setError(data.error?.message ?? "解析失败");
        return;
      }
      apply(data, file.name);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">📄 我的简历</h2>
        {source && (
          <span className="text-xs text-ink-400">
            {source} · {chars} 字
          </span>
        )}
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="把技能、项目经历粘进来……"
        className="mt-3 w-full resize-y rounded-xl border border-ink-200 px-3 py-2 text-sm leading-6 outline-none focus:border-accent-500"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={parseText}
          disabled={busy}
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-500 disabled:opacity-60"
        >
          {busy ? "处理中…" : "解析这段文字"}
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
              if (f) void parseFile(f);
            }}
          />
        </label>

        <span className="text-xs text-ink-400">txt / md / docx / pdf，≤ 5MB</span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {skills.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-ink-400">
            规则抽取到 {skills.length} 项技能（阶段 3 会换成模型抽取）
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li
                key={s}
                className="rounded-md bg-ink-100 px-2 py-1 text-xs text-ink-800"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
