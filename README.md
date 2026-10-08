# VectorHub OSS

> 无登录、开源、本地优先、首页即编辑器的在线 SVG 编辑器。

专注路径编辑与代码导出：画布编辑 → SVG 结构树 → 代码面板 → 导出/复制代码 → 本地保存 / URL 分享。

## 功能（规划）

- 在线 SVG 编辑：无限画布、形状、钢笔、节点编辑
- 图层树、分组、对齐、吸附
- SVG 结构树与 `d` / `viewBox` 直接编辑
- 代码面板：SVG / React / Vue / HTML / CSS
- 本地自动保存（IndexedDB）
- URL 压缩分享（不经服务器）
- PWA 离线可用

## 快速开始

```bash
pnpm install
pnpm dev
```

## 开发

```bash
pnpm build        # 构建
pnpm typecheck    # 类型检查
pnpm lint         # 代码检查
pnpm format       # 格式化
```

## 仓库结构

```text
apps/web              编辑器应用
packages/svg-model    SVG 文档模型
packages/plugin-api   插件 API 草案
packages/codegen      代码生成
packages/local-store  本地存储
packages/share-url    URL 分享
packages/editor-core  编辑器核心
docs                  文档（含 PRD）
examples              示例
```

## 部署

纯静态站点，支持 GitHub Pages、Cloudflare Pages、Vercel、Netlify。

## 路线图

- v0.1 无登录开源编辑器
- v0.2 插件系统、模板库、CLI
- v0.3 可选登录、云同步
- v1.0 实时协作、团队、商业化

## 贡献

请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[MIT](./LICENSE)
