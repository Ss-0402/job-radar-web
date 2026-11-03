import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { findUser } from "@/lib/auth/users";
import { FREE_PER_DAY, remaining } from "@/lib/quota";
import { Analyzer } from "@/components/analyzer";
import jobs from "../../data/jobs.json";

type Job = { id: number; title: string; jd: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const jar = await cookies();
  const username = verifySession(jar.get(SESSION_COOKIE)?.value);
  const user = username ? findUser(username) : null;
  if (!user) redirect("/login");

  const sp = await searchParams;
  const jobId = Number(sp.job);
  const job = Number.isFinite(jobId)
    ? (jobs as Job[]).find((j) => j.id === jobId)
    : undefined;

  const left = remaining(user.username);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <p className="text-xs text-ink-400">阶段 4 · 完整流程</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          贴一段 JD，看清还缺什么
        </h1>
        <p className="mt-3 max-w-xl text-sm text-ink-600 sm:text-base">
          {user.name}，今天还有 {left} / {FREE_PER_DAY} 次 AI 解析。
          左边放简历，右边贴 JD，点「分析匹配」。
        </p>
        {job && (
          <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
            已载入示例岗位：{job.title}
          </p>
        )}
      </section>

      <Analyzer remaining={left} limit={FREE_PER_DAY} initialJd={job?.jd ?? ""} />

      <p className="text-xs text-ink-400">
        岗位为虚构示例；缺口按 JD 中的出现顺序排列，不做加权打分。
      </p>
    </div>
  );
}
