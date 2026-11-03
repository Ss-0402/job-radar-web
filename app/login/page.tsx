"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

const FIELD =
  "mt-1 w-full border border-ink-300 bg-white px-3 py-2 text-ui text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(data?.error?.message ?? "请求失败，请稍后再试");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1000px] flex-col px-6 py-6">
      <div className="text-ui font-semibold tracking-tight">岗位雷达</div>

      <div className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[minmax(0,1fr)_360px] md:gap-20">
        <section className="md:pb-16">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-[-0.02em]">
            贴一段 JD，
            <br />
            看清还缺哪几项。
          </h1>
        <p className="mt-4 max-w-[30em] text-body text-ink-600">
          把招聘页上的岗位职责和你的简历放进来，得到一张逐条对照的表：哪几条你已经写了、哪几条简历里没有、先补哪三个。
        </p>
        <ul className="mt-8 space-y-2 border-t border-ink-200 pt-4 text-note text-ink-600">
          <li>· 每条要求并排给出 JD 原句和你简历里的原句，不做推断</li>
          <li>· 缺口按 JD 提及次数排序，先补影响最大的三项</li>
          <li>· 改简历只基于你写过的事实，不编造经历</li>
        </ul>
      </section>

      <section>
        <div className="flex items-baseline gap-5 border-b border-ink-300 pb-2 text-ui">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`-mb-[9px] border-b-2 pb-2 transition-colors ${
                mode === m
                  ? "border-ink-900 font-semibold text-ink-900"
                  : "border-transparent text-ink-400 hover:text-ink-900"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-micro uppercase text-ink-400">用户名</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={FIELD}
              placeholder="3–20 位，字母/数字/下划线/中文"
            />
          </label>

          <label className="block">
            <span className="text-micro uppercase text-ink-400">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={FIELD}
              placeholder="至少 6 位，别用其他网站的密码"
            />
          </label>

          {mode === "register" && (
            <label className="block">
              <span className="text-micro uppercase text-ink-400">确认密码</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={FIELD}
              />
            </label>
          )}

          {error && (
            <p className="border border-accent-300 bg-accent-50 px-3 py-2 text-note text-accent-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full border border-ink-900 bg-ink-900 px-3 py-2 text-ui text-ink-50 transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <p className="mt-4 text-note leading-relaxed text-ink-400">
          演示账号，请勿使用你在其他网站的密码。每个账号每天 3 次免费 AI 解析，失败不扣。
        </p>
        </section>
      </div>
    </main>
  );
}
