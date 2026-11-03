"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="text-note text-ink-400 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-ink-900 hover:decoration-ink-900 disabled:opacity-50"
    >
      {busy ? "退出中…" : "退出"}
    </button>
  );
}
