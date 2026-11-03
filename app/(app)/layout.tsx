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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              🎯 岗位雷达
            </Link>
            <Link href="/jobs" className="text-ink-600 hover:text-ink-900">
              示例岗位
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-sm text-ink-600 sm:gap-3">
            <span className="hidden sm:inline">👤 {user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
