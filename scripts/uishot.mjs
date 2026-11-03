// 截图工具：真实视口 + 真实登录态。
// 本机 Chrome 用 --remote-debugging-port 拿到监听端口后连 loopback 会失败，
// 所以走 --remote-debugging-pipe；管道上的根会话是 browser，需要 attach 到 page 目标再发命令。
// usage: node uishot.mjs <baseUrl> <width> <height> <out.png> ["-"|jsFile] [0|1 fullPage] [path]
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [base, w, h, out, jsArg, fullArg, pathArg] = process.argv.slice(2);
const W = Number(w);
const H = Number(h);
const jsFile = jsArg && jsArg !== "-" ? jsArg : null;
const fullPage = fullArg === "1";
const target = base + (pathArg ?? "/");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login() {
  const user = `shot_${Date.now().toString(36)}`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: user, password: "shot-test-1234" }),
  });
  if (!res.ok) throw new Error(`register failed ${res.status}`);
  const raw = res.headers.get("set-cookie") ?? "";
  const pair = raw.split(";")[0];
  const eq = pair.indexOf("=");
  return { name: pair.slice(0, eq), value: pair.slice(eq + 1), user };
}

const proc = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--user-data-dir=${process.env.TEMP}\\uishot-${Date.now()}`,
    "--remote-debugging-pipe",
    "--window-size=1200,900",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] },
);

const cdpIn = proc.stdio[3];
const cdpOut = proc.stdio[4];

const pending = new Map();
let id = 0;
let buffer = "";

cdpOut.setEncoding("utf8");
cdpOut.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\0")) >= 0) {
    const raw = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!raw) continue;
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

const raw = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, (msg) => {
      if (msg.error) console.error("cdp error", method, JSON.stringify(msg.error));
      resolve(msg);
    });
    cdpIn.write(`${JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
  });

let sessionId = "";

async function main() {
  const session = await login();
  await sleep(900);

  const targets = await raw("Target.getTargets");
  const page = (targets.result?.targetInfos ?? []).find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const attached = await raw("Target.attachToTarget", { targetId: page.targetId, flatten: true });
  sessionId = attached.result.sessionId;
  const send = (method, params = {}) => raw(method, params, sessionId);

  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: W < 600,
  });
  await send("Network.enable");
  const url = new URL(base);
  await send("Network.setCookie", {
    name: session.name,
    value: session.value,
    domain: url.hostname,
    path: "/",
    httpOnly: true,
  });
  await send("Page.enable");
  const nav = await send("Page.navigate", { url: target });
  if (nav.result?.errorText) console.error("nav error:", nav.result.errorText);
  await sleep(2200);

  if (jsFile) {
    const r = await send("Runtime.evaluate", {
      expression: readFileSync(jsFile, "utf8"),
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.result?.exceptionDetails) {
      console.error("js error:", JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    }
    await sleep(3500);
  }

  if (fullPage) {
    const metrics = await send("Page.getLayoutMetrics", {});
    const height = Math.ceil(metrics.result.cssContentSize.height);
    await send("Emulation.setDeviceMetricsOverride", {
      width: W,
      height,
      deviceScaleFactor: 1,
      mobile: W < 600,
    });
    await sleep(300);
  }

  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: fullPage,
  });
  if (!shot.result?.data) throw new Error(`screenshot failed ${JSON.stringify(shot).slice(0, 300)}`);
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("ok", out, session.user);
  proc.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  proc.kill();
  process.exit(1);
});
