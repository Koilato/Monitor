# 全球态势图应用

一个面向中文用户的独立攻击态势图项目。

## Structure

- `client/`：Vite + React + TypeScript 前端界面
- `server/`：Express + TypeScript + SQLite 后端
- `server/data/worldmonitor.sqlite`：本地 SQLite 数据库
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

## Import And Rebuild

SQLite 数据库文件生成在 `server/data/`，属于本地运行时文件，不提交到仓库。

手动回溯拉取 `api-pro.ransomware.live` 按攻击时间排序的最近 200 条可用受害事件，并重建聚合：

```bash
RANSOMWARE_LIVE_API_KEY=your_api_key npm run import:recent-victims
```

仅重建聚合表：

```bash
npm run rebuild:aggregates
```
