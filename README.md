# 项目B-岗位雷达-NextJS

岗位雷达的 Next.js 版本：贴一段 JD，给出「够不够格 / 缺哪几项 / 先补哪个」。

与现有的 Streamlit 版本（上层 `项目A-岗位雷达-Streamlit/`）完全独立：自己的仓库、自己的部署、不共享代码。

## 开发

```bash
pnpm install
cp .env.example .env.local   # 填 AUTH_SECRET
pnpm dev                     # http://localhost:3000
```

当前用 **SQLite**（Node 内置 `node:sqlite`，无原生依赖），数据文件在 `data/app.db`。
换成 Postgres 时只改 `lib/db.ts` 与 `lib/auth/users.ts` 里的 SQL，接口层不动。

## 部署（Render）

仓库带 `render.yaml`，两种方式二选一：

**A. Blueprint（推荐）**
Render → New → Blueprint → 选本仓库 → 自动读取 `render.yaml` → 填 `DEEPSEEK_API_KEY` → Deploy。

**B. 手动建 Web Service**
- Runtime: Node，Build: `pnpm install && pnpm build`，Start: `pnpm start`
- 环境变量：`AUTH_SECRET`（随机 32 字节 hex）、`DEEPSEEK_API_KEY`、`NODE_VERSION=22`

首次部署约 3–5 分钟。健康检查路径用 `/login`（未登录也能返回 200）。

## 已知限制

- **SQLite 不持久**：免费实例重启/重新部署后 `data/app.db` 会清空，账号需要重新注册。要持久化需换 Postgres 或挂持久盘（付费）。
- **免费实例会休眠**：闲置一段时间后首次访问需 30 秒左右唤醒。
- **国内访问**：Render 新加坡节点一般可达，但不如国内 CDN；如需更好体验可迁到国内服务器。

## 冒烟测试

```bash
pnpm build && pnpm start          # 另开一个终端
node scripts/smoke.mjs http://127.0.0.1:3000
```

覆盖：未登录跳转、注册、`/me`、简历解析、JD 分析、额度扣减、退出。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册并登录，写 httpOnly cookie |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出，清 cookie |
| GET | `/api/auth/me` | 当前用户 + 今日剩余额度 |
| POST | `/api/resume/parse` | 上传文件或粘贴文本 → 纯文本 + 技能标签（规则，不耗额度） |
| POST | `/api/jd/analyze` | JD → 结构化要求 + 缺口；调模型才扣额度，耗尽自动退回规则 |

## 目录

```
app/(app)/        受保护区域（layout 里做会话守卫）
app/login/        登录 / 注册
app/api/auth/     认证接口
app/api/resume/   简历解析接口
app/api/jd/       JD 分析接口
lib/auth/         password(scrypt) · session(HMAC) · users(SQL) · guard
lib/parse/        简历文件 → 文本（mammoth / unpdf）
lib/match/        技能词表与抽取（含别名归一）· 缺口计算
lib/llm/          DeepSeek 调用与 JD 结构化（失败回退规则）
lib/quota.ts      每日额度（SQL 原子扣减）
lib/db.ts         SQLite 连接与建表
```

## 当前进度

- [x] 阶段 0：脚手架、Tailwind、首页壳子
- [x] 阶段 1：注册 / 登录 / 会话守卫（SQLite）
- [x] 阶段 2：简历解析（txt / md / docx / pdf）+ 规则技能抽取
- [x] 阶段 3：JD 分析 + 匹配结论 + 额度扣减
- [ ] 阶段 4：示例岗位池 + 移动端打磨
- [ ] 阶段 5：测试与收尾

完整设计见 `../文档/岗位雷达-NextJS-重构方案-v1.md`。
