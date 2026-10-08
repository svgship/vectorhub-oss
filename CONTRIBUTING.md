# 贡献指南

感谢参与 VectorHub OSS。开始前请先阅读 `docs/PRD.md`，了解产品范围与优先级。

## 环境要求

- Node.js >= 20
- pnpm 10（`corepack enable` 后自动使用 `packageManager` 指定版本）

## 本地开发

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
pnpm dev            # 启动编辑器开发服务器
pnpm build          # 构建生产包
pnpm typecheck      # 全量类型检查
pnpm lint           # ESLint 检查
pnpm format         # Prettier 格式化
```

## 仓库结构

```text
apps/web             编辑器应用（Vite + React）
packages/svg-model   SVG 文档模型
packages/plugin-api  插件 API 草案
packages/codegen     代码生成（SVG / React / Vue / HTML-CSS）
packages/local-store IndexedDB 本地存储
packages/share-url   URL 压缩分享
packages/editor-core 编辑器状态与核心逻辑
docs                 产品与技术文档
examples             示例
```

## 提交约定

- 使用 Conventional Commits：`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`。
- 提交前确保 `pnpm lint`、`pnpm typecheck`、`pnpm build` 全部通过。
- 一个 PR 只做一件事，保持改动聚焦。

## 分支与 PR

- 分支前缀使用 `codex/` 或 `feat/`、`fix/`。
- PR 描述需说明：改动内容、验证方式、关联 Issue。

## 许可证

提交即表示同意以 MIT 许可证发布你的贡献。
