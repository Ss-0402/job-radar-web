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
  const cities = Array.from(new Set(ALL.map((j) => j.city))).sort();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs text-ink-400">阶段 4 · 示例岗位池</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">18 条示例岗位</h1>
        <p className="mt-2 text-sm text-ink-600">
          没想好投哪个？挑一条点「用这条 JD 试试」，会带回主页自动填入。
        </p>
      </section>

      <div className="flex flex-wrap gap-1.5 text-xs text-ink-500">
        {directions.map((d) => (
          <span key={d} className="rounded-md bg-ink-100 px-2 py-1">
            {d}
          </span>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ALL.map((job) => (
          <li
            key={job.id}
            className="rounded-xl border border-ink-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{job.title}</h2>
                <p className="mt-1 text-xs text-ink-500">
                  {job.company} · {job.city} · {job.degree} · {job.direction}
                </p>
              </div>
              <Link
                href={`/?job=${job.id}`}
                className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1 text-xs text-ink-700 transition hover:bg-ink-50"
              >
                用这条 JD 试试
              </Link>
            </div>

            <ul className="mt-3 flex flex-wrap gap-1">
              {job.skills.slice(0, 5).map((s) => (
                <li key={s} className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-600">
                  {s}
                </li>
              ))}
            </ul>

            <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-500">
              {job.jd.replace(/\n/g, " ").slice(0, 90)}…
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
