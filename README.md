# 全球态势图应用

一个面向中文用户的独立攻击态势图项目。

## Structure

- `client/`：Vite + React + TypeScript 前端界面
- `server/`：Express + TypeScript + SQLite 后端
- `server/fixtures/incidents.json`：初始化 seed 数据
- `shared/`：共享响应与查询类型

## Install

在仓库根目录安装依赖：

```bash
npm install
```

## Run

推荐直接一键启动前后端：

```bash
npm run dev
```

如果你需要分开调试，也可以分别启动。

启动后端：

```bash
npm run dev:server
```

在另一个终端启动前端：

```bash
npm run dev:client
```

前端默认连接 `http://localhost:8787`。

## Build

构建前后端：

```bash
npm run build
```

或分别构建：

```bash
npm run build:server
npm run build:client
```

## Seed And Import

后端会在空 SQLite 数据库启动时自动从 `server/fixtures/incidents.json` 导入示例数据。SQLite 数据库文件会生成在 `server/data/`，属于本地运行时文件，不提交到仓库。

你也可以手动执行：

```bash
npm run seed
```

导入外部 JSON：

```bash
npm run import:incidents -- /absolute/path/incidents.json
```

重建聚合表：

```bash
npm run rebuild:aggregates
```
