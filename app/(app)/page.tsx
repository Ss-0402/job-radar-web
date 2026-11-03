import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { findUser } from "@/lib/auth/users";
import { FREE_PER_DAY, remaining } from "@/lib/quota";
import { Analyzer } from "@/components/analyzer";

export default async function HomePage() {
  const jar = await cookies();
  const username = verifySession(jar.get(SESSION_COOKIE)?.value);
  const user = username ? findUser(username) : null;
  if (!user) redirect("/login");

  const left = remaining(user.username);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs text-ink-400">阶段 3 · JD 分析与缺口已接通</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          贴一段 JD，看清还缺什么
        </h1>
        <p className="mt-3 max-w-xl text-ink-600">
          {user.name}，今天还有 {left} / {FREE_PER_DAY} 次 AI 解析。
          左边放简历，右边贴 JD，点「分析匹配」。
        </p>
      </section>

      <Analyzer remaining={left} limit={FREE_PER_DAY} />

      <p className="text-xs text-ink-400">
        岗位为虚构示例；缺口顺序按 JD 里的出现顺序，不做加权打分。
      </p>
    </div>
  );
}
