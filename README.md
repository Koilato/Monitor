# 全球态势图应用

一个面向中文用户的独立攻击态势图项目。

## Structure

- `client/`：Vite + React + TypeScript 前端界面
- `server/`：Express + TypeScript 模拟 API
- `shared/`：共享的响应与查询类型

## Run

只需要在仓库根目录安装依赖：

```bash
npm install
```

不要在 `client/` 或 `server/` 目录中单独执行 `npm install`，仓库根目录的 `package-lock.json` 是唯一受支持的锁文件。

启动模拟 API：

```bash
npm run dev:server
```

在另一个终端启动前端界面：

```bash
npm run dev:client
```

构建前后端：

```bash
npm run build
```

运行测试：

```bash
npm run test
```

前端默认连接 `http://localhost:8787`。
