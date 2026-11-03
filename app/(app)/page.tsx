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
    <div>
      <Analyzer remaining={left} limit={FREE_PER_DAY} initialJd={job?.jd ?? ""} />
      <p className="mt-10 border-t border-ink-200 pt-3 text-note text-ink-400">
        岗位为虚构示例；缺口按 JD 提及次数排序，不做加权打分。
      </p>
    </div>
  );
}
