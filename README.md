# job-radar-web

岗位雷达的 Next.js 版本：贴一段 JD，给出「够不够格 / 缺哪几项 / 先补哪个」。

与现有的 Streamlit 版本（上层 `deploy/`）完全独立：自己的仓库、自己的部署、不共享代码。

## 开发

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## 当前进度

- [x] 阶段 0：脚手架、Tailwind、首页壳子
- [ ] 阶段 1：注册 / 登录 / 会话守卫
- [ ] 阶段 2：简历解析（txt / docx / pdf）
- [ ] 阶段 3：JD 分析 + 匹配结论 + 额度
- [ ] 阶段 4：示例岗位池 + 移动端打磨
- [ ] 阶段 5：测试与收尾

完整设计见 `../岗位雷达-NextJS-重构方案-v1.md`。
