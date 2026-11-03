/**
 * 冒烟测试：对着一个已启动的服务跑一遍主路径。
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * 默认 http://127.0.0.1:3000。需要该实例能调通 DeepSeek（.env.local 里有 key）。
 * 会真实消耗 1 次 LLM 额度；用不存在的用户名自动注册一个临时账号。
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const USER = `smoke_${Date.now().toString(36)}`;
const PASS = `smoke-${Math.random().toString(36).slice(2, 10)}`;

let cookie = "";
const fails = [];

function ok(label, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? `  [${extra}]` : ""}`);
  if (!cond) fails.push(label);
}

async function call(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 非 JSON（HTML 页面）保持 null */
  }
  return { status: res.status, json, text, location: res.headers.get("location") };
}

const JD = `岗位职责：
1. 负责知识库问答产品开发，基于 LangChain 搭建 RAG 流程；
2. 使用 FastAPI 提供服务接口，对接向量数据库；
任职要求：
1. 本科及以上学历，2 年以上 Python 经验；
2. 熟悉 Docker、Kubernetes、Redis；
3. 了解 RAG 与向量检索。`;

const RESUME = "本科，熟悉 Python、SQL、Docker，做过 RAG 问答项目，用过 LangChain。";

// 1. 未登录访问受保护页面 → 跳登录
let r = await call("/");
ok("未登录访问 / 被重定向到 /login", r.status >= 300 && r.status < 400 && (r.location ?? "").includes("/login"),
  `${r.status} ${r.location}`);

// 2. 注册
r = await call("/api/auth/register", { method: "POST", body: { username: USER, password: PASS } });
ok("注册成功并下发 cookie", r.status === 200 && cookie !== "", r.status);

// 3. 当前用户
r = await call("/api/auth/me");
ok("me 返回用户与额度", r.status === 200 && r.json?.quota?.limit === 3,
  JSON.stringify(r.json?.quota));

// 4. 简历解析（粘贴）
r = await call("/api/resume/parse", { method: "POST", body: { text: RESUME } });
ok("简历解析出技能", r.status === 200 && (r.json?.skills ?? []).includes("Python"),
  JSON.stringify(r.json?.skills));

// 5. JD 分析
r = await call("/api/jd/analyze", { method: "POST", body: { jdText: JD, resumeText: RESUME } });
const match = r.json?.match;
ok("JD 分析返回匹配结果", r.status === 200 && match?.total > 0,
  `total=${match?.total} matched=${match?.matched?.length} missing=${match?.missing?.length}`);
ok("缺口非空", (match?.missing?.length ?? 0) > 0, JSON.stringify(match?.missing));
ok("额度已扣减", r.json?.quota?.remaining === 2, JSON.stringify(r.json?.quota));

// 6. 未登录的解析接口
const saved = cookie;
cookie = "";
r = await call("/api/resume/parse", { method: "POST", body: { text: RESUME } });
ok("未登录解析被拒", r.status === 401, r.status);
cookie = saved;

// 7. 退出
r = await call("/api/auth/logout", { method: "POST" });
ok("退出成功", r.status === 200, r.status);
r = await call("/api/auth/me");
ok("退出后 me 返回 401", r.status === 401, r.status);

console.log();
if (fails.length) {
  console.log(`FAILED ${fails.length}: ${fails.join(", ")}`);
  process.exit(1);
}
console.log(`ALL PASS  (base=${BASE}, user=${USER})`);
