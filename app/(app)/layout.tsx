import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { findUser } from "@/lib/auth/users";
import { LogoutButton } from "@/components/logout-button";

/**
 * 受保护的布局：没有有效会话直接跳登录页。
 * 这一层在服务端执行，cookie 不会到达浏览器 JS，也不需要前端守卫。
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const username = verifySession(jar.get(SESSION_COOKIE)?.value);
  const user = username ? findUser(username) : null;

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            🎯 岗位雷达
          </Link>
          <div className="flex items-center gap-3 text-sm text-ink-600">
            <span>👤 {user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
