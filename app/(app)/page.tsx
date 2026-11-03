import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { findUser } from "@/lib/auth/users";
import { FREE_PER_DAY, remaining } from "@/lib/quota";
import { ResumePanel } from "@/components/resume-panel";

export default async function HomePage() {
  const jar = await cookies();
  const username = verifySession(jar.get(SESSION_COOKIE)?.value);
  const user = username ? findUser(username) : null;
  if (!user) redirect("/login");

  const left = remaining(user.username);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs text-ink-400">阶段 2 · 简历解析已接通</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          贴一段 JD，看清还缺什么
        </h1>
        <p className="mt-3 max-w-xl text-ink-600">
          {user.name}，今天还有 {left} / {FREE_PER_DAY} 次免费 AI 解析。
          先把简历放进来：上传文件或粘贴，下方会抽出技能标签。
        </p>
      </section>

      <ResumePanel />

      <section>
        <h2 className="text-sm font-semibold text-ink-600">接下来</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["01", "贴 JD", "从招聘页面复制岗位描述"],
            ["02", "对简历", "已有技能对照岗位要求"],
            ["03", "看缺口", "缺哪几项、先补哪个"],
          ].map(([step, title, desc]) => (
            <div
              key={step}
              className="rounded-xl border border-ink-200 bg-white p-4"
            >
              <dt className="text-xs text-ink-400">{step}</dt>
              <dd className="mt-1 text-sm font-medium">{title}</dd>
              <dd className="mt-1 text-xs text-ink-600">{desc}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-400">
          JD 输入与缺口结论在阶段 3 接入。
        </p>
      </section>
    </div>
  );
}
