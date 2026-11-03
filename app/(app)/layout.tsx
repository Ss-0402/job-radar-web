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
      <header className="border-b border-ink-200 bg-ink-50">
        <div className="mx-auto flex h-12 max-w-[1180px] items-center justify-between gap-4 px-5 sm:px-8">
          <nav className="flex items-baseline gap-6 text-ui">
            <Link href="/" className="font-semibold tracking-tight">
              岗位雷达
            </Link>
            <Link
              href="/"
              className="text-ink-400 transition-colors hover:text-ink-900"
            >
              工作台
            </Link>
            <Link
              href="/jobs"
              className="text-ink-400 transition-colors hover:text-ink-900"
            >
              岗位池
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-note text-ink-400">
            <span className="tnum">{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
