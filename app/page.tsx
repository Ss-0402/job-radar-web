export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <p className="text-sm text-ink-400">阶段 0 · 脚手架</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        🎯 岗位雷达
      </h1>
      <p className="mt-3 text-ink-600">
        贴一段 JD，30 秒看清你够不够格、还缺哪几项。
      </p>

      <dl className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["01", "贴 JD", "从招聘页面复制岗位描述"],
          ["02", "对简历", "上传或粘贴你的简历"],
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

      <p className="mt-10 text-xs text-ink-400">
        这个页面是迁移的第一步：跑起来了，后面才有登录、解析、匹配。
      </p>
    </main>
  );
}
