# job-radar-web

岗位雷达的 Next.js 版本：贴一段 JD，给出「够不够格 / 缺哪几项 / 先补哪个」。

与现有的 Streamlit 版本（上层 `deploy/`）完全独立：自己的仓库、自己的部署、不共享代码。

## 开发

```bash
pnpm install
cp .env.example .env.local   # 填 AUTH_SECRET
pnpm dev                     # http://localhost:3000
```

当前用 **SQLite**（Node 内置 `node:sqlite`，无原生依赖），数据文件在 `data/app.db`。
换成 Postgres 时只改 `lib/db.ts` 与 `lib/auth/users.ts` 里的 SQL，接口层不动。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册并登录，写 httpOnly cookie |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出，清 cookie |
| GET | `/api/auth/me` | 当前用户 + 今日剩余额度 |

## 目录

```
app/(app)/        受保护区域（layout 里做会话守卫）
app/login/        登录 / 注册
app/api/auth/     认证接口
lib/auth/         password(scrypt) · session(HMAC) · users(SQL)
lib/quota.ts      每日额度
lib/db.ts         SQLite 连接与建表
```

## 当前进度

- [x] 阶段 0：脚手架、Tailwind、首页壳子
- [x] 阶段 1：注册 / 登录 / 会话守卫（SQLite）
- [ ] 阶段 2：简历解析（txt / docx / pdf）
- [ ] 阶段 3：JD 分析 + 匹配结论 + 额度扣减
- [ ] 阶段 4：示例岗位池 + 移动端打磨
- [ ] 阶段 5：测试与收尾

完整设计见 `../岗位雷达-NextJS-重构方案-v1.md`。
