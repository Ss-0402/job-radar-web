"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">🎯 岗位雷达</h1>
      <p className="mt-2 text-sm text-ink-600">
        贴一段 JD，30 秒看清你够不够格、还缺哪几项。
      </p>

      <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-5">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-md px-3 py-1.5 transition ${
                mode === m
                  ? "bg-white font-medium shadow-sm"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs text-ink-600">用户名</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-accent-500"
              placeholder="3–20 位，字母/数字/下划线/中文"
            />
          </label>

          <label className="block">
            <span className="text-xs text-ink-600">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-accent-500"
              placeholder="至少 6 位，别用其他网站的密码"
            />
          </label>

          {mode === "register" && (
            <label className="block">
              <span className="text-xs text-ink-600">确认密码</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-500 disabled:opacity-60"
          >
            {busy ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-ink-400">
        演示账号，请勿使用你在其他网站的密码。每个账号每天 3 次免费 AI 解析。
      </p>
    </main>
  );
}
