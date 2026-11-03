import Link from "next/link";
import jobs from "../../../data/jobs.json";

type Job = {
  id: number;
  title: string;
  company: string;
  city: string;
  degree: string;
  direction: string;
  skills: string[];
  jd: string;
};

const ALL = jobs as Job[];

export default function JobsPage() {
  const directions = Array.from(new Set(ALL.map((j) => j.direction))).sort();

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-page font-semibold">岗位池</h1>
        <p className="text-note text-ink-400">
          {ALL.length} 条虚构示例 · 挑一条带回工作台
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-ink-200 py-2 text-note text-ink-400">
        <span>方向</span>
        {directions.map((d) => (
          <span key={d} className="text-ink-700">
            {d}
          </span>
        ))}
      </div>

      <ul className="mt-1">
        {ALL.map((job) => (
          <li
            key={job.id}
            className="group border-b border-ink-200 transition-colors hover:bg-ink-100"
          >
            <Link
              href={`/?job=${job.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
            >
              <span className="min-w-0">
                <span className="block text-ui font-semibold text-ink-900">{job.title}</span>
                <span className="mt-0.5 block text-note text-ink-400">
                  {job.company} · {job.city} · {job.degree}
                </span>
              </span>

              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-note text-ink-600">
                  {job.skills.slice(0, 6).join("、")}
                </span>
                <span className="mt-0.5 block text-note text-ink-400">
                  要求 {job.skills.length} 项
                </span>
              </span>

              <span className="shrink-0 text-note text-ink-400 group-hover:text-ink-900">
                用这条 JD →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-note text-ink-400">
        点任意一行会把这条 JD 带回工作台，简历还是你自己那份。
      </p>
    </div>
  );
}
