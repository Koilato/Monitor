# World Monitor 前端重构计划：原生 TypeScript → React + Vite + Zustand + Tailwind CSS

## 摘要

将 World Monitor 主应用（`src/`）从原生 TypeScript + DOM API 架构完整重构为 React 19 + TypeScript + Zustand + Tailwind CSS 架构。项目当前有 400+ TypeScript 文件、130+ 面板组件、80+ 服务，采用 `innerHTML` + `addEventListener` 的命令式 DOM 操作模式。重构后采用声明式 React 组件化架构，仅关注 Web 端（不含 Tauri 桌面端）。**同时移除所有付费/Pro/订阅相关功能，所有面板和功能对所有用户开放。**

---

## 当前状态分析

### 技术栈现状

| 层面 | 当前技术 |
|------|---------|
| UI 框架 | 原生 TypeScript + DOM API（无虚拟 DOM） |
| 构建工具 | Vite 6 |
| 状态管理 | AppContext 可变对象（~40 个字段） |
| 样式 | 原生 CSS + CSS 变量主题系统（10 个 CSS 文件） |
| 地图 | MapLibre GL + Deck.gl + Globe.gl + d3 |
| 国际化 | i18next（21 种语言） |
| 认证 | Clerk JS SDK |
| 后端 | Convex + Vercel Edge Functions |
| 错误监控 | Sentry Browser |
| PWA | vite-plugin-pwa + Workbox |
| 桌面端 | Tauri 2（本次不保留） |

### 核心架构特征

- **App.ts (~65KB)**：上帝类，包含所有初始化、数据加载、事件处理逻辑
- **Panel 基类**：所有 130+ 面板继承此类，通过 `document.createElement` + `innerHTML` + `addEventListener` 手动管理 DOM
- **PanelLayoutManager**：管理面板创建、排序、拖拽、显示/隐藏
- **AppContext**：全局可变状态容器，40+ 字段
- **DataLoaderManager**：集中管理所有数据获取
- **EventHandlerManager**：集中管理所有 DOM 事件绑定
- **多入口点**：`index.html`（主应用）、`settings.html`（设置）、`live-channels.html`（频道）
- **多变体**：full、tech、finance、commodity、happy（通过 `VITE_VARIANT`）

### 可直接复用的资产（无需重写）

- `src/services/` 下约 80% 的文件（纯数据获取/处理逻辑，与 DOM 无关）
- `src/config/` 全部配置文件
- `src/types/` 类型定义
- `src/locales/` i18n 翻译文件
- `src/generated/` protobuf 生成代码
- `src/data/` 静态 JSON 数据
- `api/` Edge Functions（完全独立，不受影响）
- `convex/` 后端逻辑（不受影响）
- `scripts/` 种子脚本（不受影响）

---

## 目标技术栈

| 层面 | 目标技术 |
|------|---------|
| UI 框架 | **React 19** + TypeScript |
| 构建工具 | **Vite**（继续使用） |
| 状态管理 | **Zustand 5** |
| 样式 | **Tailwind CSS 4**（保留 CSS 变量主题系统） |
| 路由 | **React Router 7**（合并 3 个 HTML 入口为单页应用） |
| 地图 | MapLibre GL + Deck.gl + Globe.gl（保留） |
| 国际化 | i18next（保留，封装为 React hook） |
| 认证 | **Clerk React SDK**（从 JS SDK 升级） |
| 后端 | Convex（保留，升级为 React hooks） |
| 错误监控 | **Sentry React SDK**（从 Browser SDK 升级） |
| PWA | vite-plugin-pwa（保留） |
| 桌面端 | **移除** Tauri 相关代码 |

---

## 目标目录结构

```
src/
  components/                   # React 组件
    ui/                         # 通用 UI 原子组件
      PanelShell.tsx            # 替代 Panel 基类的壳组件
      PanelHeader.tsx           # 面板头部
      PanelTabs.tsx             # 面板标签页
      PanelResizeHandle.tsx     # 面板调整大小手柄
      Badge.tsx, Button.tsx, Modal.tsx, Tooltip.tsx, Skeleton.tsx
      VirtualList.tsx           # 从 VirtualList.ts 迁移

    panels/                     # 业务面板组件（按领域分组）
      news/                     # 新闻/情报面板
      market/                   # 市场/金融面板
      military/                 # 军事/地缘政治面板
      infrastructure/           # 基础设施面板
      climate/                  # 气候/环境面板
      finance/                  # 宏观金融面板
      happy/                    # happy 变体专属面板

    map/                        # 地图组件
      MapContainer.tsx           # 条件渲染器
      DeckGLMap.tsx              # React wrapper
      GlobeMap.tsx               # React wrapper
      MapFallback.tsx            # D3/SVG 移动端降级
      MapToolbar.tsx, MapPopup.tsx, MapContextMenu.tsx

    layout/                     # 布局组件
      AppShell.tsx               # 替代 App.renderLayout()
      Header.tsx, PanelGrid.tsx, PanelGridItem.tsx, BottomBar.tsx

    modals/                     # 模态框（SearchModal, SignalModal, CountryIntelModal 等）
    banners/                    # 横幅（BreakingNewsBanner, DownloadBanner 等）
    settings/                   # 设置相关
    RouteExplorer/              # 路线探索器

  hooks/                        # 自定义 Hooks
    usePanel.ts                 # 面板通用逻辑
    usePanelVisibility.ts       # 面板可见性检测
    useDataRefresh.ts           # 数据刷新调度
    useMapLayers.ts             # 地图图层状态
    useMapViewport.ts           # 地图视口状态
    useTheme.ts, useI18n.ts, useAuth.ts, useBreakpoints.ts
    useLocalStorage.ts, useAbortController.ts

  stores/                       # Zustand 状态管理
    app-store.ts                # 全局应用状态
    panel-store.ts              # 面板配置/排序/可见性
    map-store.ts                # 地图状态
    news-store.ts               # 新闻数据
    market-store.ts             # 市场数据
    intelligence-store.ts       # 情报缓存
    ui-store.ts                 # UI 状态（模态框、横幅）
    auth-store.ts               # 认证状态
    settings-store.ts           # 用户设置

  pages/                        # 页面级组件（React Router 路由）
    DashboardPage.tsx           # 主仪表盘（/）
    SettingsPage.tsx            # 设置页（/settings）
    LiveChannelsPage.tsx        # 频道页（/channels）

  services/                     # [大部分保留] 数据服务层
  config/                       # [完全保留] 配置
  types/                        # [完全保留] 类型定义
  locales/                      # [完全保留] 国际化
  generated/                    # [完全保留] 生成代码
  data/                         # [完全保留] 静态数据
  utils/                        # 工具函数（移除 DOM 操作，新增 React 工具）
  styles/                       # Tailwind CSS 入口 + 保留的 CSS 变量
```

---

## 实施计划（9 个阶段）

### 阶段 0：移除付费/Pro/订阅功能

**目标：** 删除所有付费相关代码、组件、服务、配置和样式，使所有面板和功能对所有用户完全开放。

**具体任务：**

1. **删除 10 个核心付费文件**
   - `src/services/checkout.ts` — Dodo Payments 结账服务
   - `src/services/checkout-return.ts` — 支付后重定向检测
   - `src/services/billing.ts` — 订阅状态监控
   - `src/services/entitlements.ts` — 前端 entitlement 服务
   - `src/services/panel-gating.ts` — 面板门控逻辑（`PanelGateReason`, `hasPremiumAccess`, `getPanelGateReason`）
   - `src/components/ProBanner.ts` — Pro 升级横幅
   - `src/components/payment-failure-banner.ts` — 支付失败横幅
   - `src/config/products.generated.ts` — Dodo Payments 产品 ID
   - `src/config/products.ts` — 产品 ID 重导出
   - `src/shared/premium-paths.ts` — Premium RPC 路径列表

2. **修改 30+ 个文件，移除付费相关代码**
   - **App.ts**：移除 `isProUser`, `hasPremiumAccess`, `initEntitlementSubscription`, `destroyEntitlementSubscription`, `resetEntitlementState`, `initSubscriptionWatch`, `destroySubscriptionWatch`, `capturePendingCheckoutIntentFromUrl`, `resumePendingCheckout`, `showProBanner` 的 import 和调用；移除 `FREE_MAX_PANELS`/`FREE_MAX_SOURCES` 限制逻辑
   - **app/panel-layout.ts**：移除 `WEB_PREMIUM_PANELS`, entitlement/subscription/checkout import, `updatePanelGating()`, `applyProGate()`, `applyProBlockGating()`, `worldmonitor.app/pro` 链接
   - **app/event-handlers.ts**：移除 `isProUser`, `trackGateHit`, `AuthLauncher` import 和调用；移除 `FREE_MAX_PANELS`/`FREE_MAX_SOURCES` 限制
   - **app/search-manager.ts**：移除 `isProUser` import 和检查
   - **app/data-loader.ts**：移除 `hasPremiumAccess` import 和 `_desktopLocked` premium 检查
   - **app/country-intel.ts**：移除 `hasPremiumAccess` import
   - **components/Panel.ts**：移除 `PanelGateReason` import, `showLocked()`, `showGatedCta()`, `unlockPanel()` 方法, `panel-pro-badge`, `worldmonitor.app/pro` 链接
   - **components/CountryDeepDivePanel.ts**：移除 `hasPremiumAccess`, `trackGateHit`, `makeProLocked()`, `proMetricBox()`, 所有 `isPro` 检查
   - **components/DeckGLMap.ts**：移除 `hasPremiumAccess`, `trackGateHit`, `isPremium` 检查, `layer-pro-badge`
   - **components/GlobeMap.ts**：移除 `layer-pro-badge`
   - **components/MapPopup.ts**：移除 `hasPremiumAccess`, `trackGateHit`, `isPro` 检查
   - **components/MapContainer.ts**：移除 `hasPremiumAccess`, `trackGateHit`
   - **components/SupplyChainPanel.ts**：移除 `hasPremiumAccess`, `trackGateHit`, `isPro` 检查
   - **components/ResilienceWidget.ts**：移除 `DEFAULT_UPGRADE_PRODUCT`, `PanelGateReason`, `getPanelGateReason`, `worldmonitor.app/pro` 链接
   - **components/RouteExplorer/RouteExplorer.ts**：移除 `hasPremiumAccess`, `trackGateHit`, `gateHitTracked`, `worldmonitor.app/pro` 链接
   - **components/DailyMarketBriefPanel.ts**：移除 `hasPremiumAccess`, `isPremium` 传递
   - **components/MarketImplicationsPanel.ts**：移除 `hasPremiumAccess`, `isPremium` 传递
   - **components/DeductionPanel.ts**：移除 `hasPremiumAccess`, `isPremium` 传递
   - **components/InsightsPanel.ts**：移除 `hasPremiumAccess`, `isPremium` 传递
   - **components/FrameworkSelector.ts**：移除 `PanelGateReason`, `isPremium` 参数
   - **components/WidgetChatModal.ts**：移除 `isProWidgetEnabled`, `getProWidgetKey`, `widget-pro-badge`, `isPro` 条件逻辑
   - **components/McpDataPanel.ts**：移除 `isProWidgetEnabled`, `getProWidgetKey`
   - **components/CustomWidgetPanel.ts**：移除 `widget-pro-badge`
   - **components/AuthLauncher.ts**：移除整个文件（认证启动器，被付费功能使用）
   - **components/RuntimeConfigPanel.ts**：移除 `worldmonitor.app/pro` 链接
   - **components/UnifiedSettings.ts**：移除 `isProUser`, `isEntitled`, `getSubscription`, `openBillingPortal`, `panel-toggle-pro-badge`, `worldmonitor.app/pro` 链接
   - **config/panels.ts**：移除 `isEntitled` import, 所有 `premium: 'locked'` 定义, `FREE_MAX_PANELS`, `FREE_MAX_SOURCES`, `isPanelEntitled()` 函数
   - **config/map-layer-definitions.ts**：移除所有 `premium: 'locked'` 图层定义和类型
   - **types/index.ts**：移除 `premium?: 'locked' | 'enhanced'` 类型定义
   - **services/widget-store.ts**：移除 `setProKey()`, `isProWidgetEnabled()`, `isProUser()`, `getProWidgetKey()`, `wm-pro-key` cookie/localStorage 操作
   - **services/analytics.ts**：移除 `onSubscriptionChange`, `trackGateHit()` 函数
   - **services/notifications-settings.ts**：移除 `hasTier`, `isPro` 检查, `worldmonitor.app/pro` 链接
   - **services/correlation-engine/engine.ts**：移除 `hasPremiumAccess` import
   - **services/analysis-framework-store.ts**：移除 `hasPremiumAccess` import
   - **settings-main.ts**：移除 `data-wm-open-pro` 按钮, `worldmonitor.app/pro` 链接
   - **settings-window.ts**：移除 `isProUser` import 和检查
   - **main.ts**：移除 Dodo checkout chunk 相关错误处理

3. **移除付费相关 CSS 样式**
   - `styles/main.css`：移除 `.panel-locked-state`, `.panel-locked-icon`, `.panel-locked-desc`, `.panel-locked-features`, `.panel-locked-cta`, `.pro-banner` 系列, `.panel-pro-badge`, `.layer-pro-badge`, `.panel-toggle-pro-badge`, `.widget-pro-badge`, `.ai-widget-block-pro`
   - `styles/country-deep-dive.css`：移除 `.cdp-pro-locked`, `.cdp-pro-lock-icon`, `.cdp-pro-lock-text`, `.cdp-pro-badge` 系列

4. **清理 locale 文件中的付费翻译键**
   - 所有 21 个 locale 文件：移除 `premium.*`、`widgets.proBadge`、`widgets.preflightProUnavailable`、`widgets.preflightInvalidProKey`、`modals.settingsWindow.freePanelLimit`、`modals.settingsWindow.freeSourceLimit`、`pricing` 相关键

5. **移除付费相关 npm 依赖**
   - 从 `package.json` 移除 `dodopayments-checkout`
   - 移除 `VITE_DODO_ENVIRONMENT` 环境变量引用

6. **解锁所有面板和地图图层**
   - `config/panels.ts` 中标记为 `premium: 'locked'` 的面板全部移除 `premium` 字段
   - `config/map-layer-definitions.ts` 中标记为 `premium: 'locked'` 的图层（iranAttacks, gpsJamming, resilienceScore）全部移除 `premium` 字段

**涉及文件：**
- 删除：10 个核心付费文件 + `components/AuthLauncher.ts`
- 修改：30+ 个文件（移除 import、条件逻辑、UI 元素和链接）
- 修改：2 个 CSS 文件（移除付费样式类）
- 修改：21 个 locale 文件（移除付费翻译键）
- 修改：`package.json`（移除 dodopayments-checkout）

**验证标准：**
- `npm run build` 成功（无 TypeScript 编译错误）
- 所有面板对所有用户可见，无门控/锁定状态
- 无 `worldmonitor.app/pro` 链接残留
- 无 `isProUser`, `hasPremiumAccess`, `PanelGateReason` 引用残留

---

### 阶段 1：基础设施搭建与 React 引入

**目标：** 建立 React 运行时环境，不改变任何现有功能。新旧代码共存。

**具体任务：**

1. **安装依赖**
   - 新增：`react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`
   - 新增：`zustand@^5`, `@vitejs/plugin-react@^4`
   - 新增：`tailwindcss@^4`, `@tailwindcss/vite@^4`
   - 新增：`@tanstack/react-virtual@^3`
   - 移除：`preact@^10.25.4`

2. **配置 Tailwind CSS**
   - 创建 `src/styles/tailwind.css` 作为 Tailwind 入口
   - 配置 `tailwind.config.ts`，映射现有 CSS 变量到 Tailwind 主题
   - dark mode 策略配置为 `class`（匹配现有 `[data-theme="dark"]` 机制）

3. **更新构建配置**
   - `vite.config.ts`：添加 `@vitejs/plugin-react` 插件，新增 React/Zustand chunk 分割
   - `tsconfig.json`：添加 `"jsx": "react-jsx"`
   - 保留所有现有 Vite 插件（PWA, brotli, dev server proxies 等）

4. **引入 React Router，合并为单入口应用**
   - 移除 `settings.html` 和 `live-channels.html`（不再需要独立入口）
   - 仅保留 `index.html` 作为唯一入口
   - 配置 React Router 路由：
     ```
     /           → DashboardPage（主仪表盘）
     /settings   → SettingsPage（设置页）
     /channels   → LiveChannelsPage（频道管理页）
     ```
   - 创建 `src/react-main.tsx` 作为 React 应用入口，包含 `<BrowserRouter>` 和路由配置
   - 在 `src/main.ts` 中挂载 React 根组件

5. **创建基础骨架**
   - `src/components/ui/PanelShell.tsx` - 面板壳组件骨架
   - `src/stores/app-store.ts` - 最基础的 Zustand store
   - `src/hooks/useTheme.ts` - 主题 hook

**涉及文件：**
- 修改：`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`
- 删除：`settings.html`, `live-channels.html`
- 新增：`src/react-main.tsx`, `src/styles/tailwind.css`, `tailwind.config.ts`, `src/stores/app-store.ts`, `src/components/ui/PanelShell.tsx`, `src/hooks/useTheme.ts`, `src/pages/DashboardPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/LiveChannelsPage.tsx`

**验证标准：**
- `npm run dev` 启动正常，现有界面完全不变
- `npm run build` 成功
- 所有现有 E2E 测试通过

---

### 阶段 2：状态管理迁移（AppContext → Zustand）

**目标：** 将 AppContext 的数据字段拆分为多个 Zustand stores，建立响应式状态层。

**具体任务：**

1. **创建 Zustand Stores（8 个）**
   - `stores/app-store.ts` — 设备/环境/连接状态
   - `stores/panel-store.ts` — 面板配置、排序、可见性
   - `stores/map-store.ts` — 地图图层、视口、时间范围
   - `stores/news-store.ts` — 新闻数据、聚类
   - `stores/market-store.ts` — 市场数据
   - `stores/intelligence-store.ts` — 情报缓存
   - `stores/ui-store.ts` — 模态框、横幅状态
   - `stores/settings-store.ts` — 用户设置/偏好

2. **创建适配层**
   - `src/app/context-adapter.ts` — 在 `App.init()` 中初始化所有 stores
   - AppContext 读写操作代理到对应 store
   - 现有代码无感知运行

3. **迁移数据加载和刷新**
   - `DataLoaderManager` 结果写入 Zustand stores
   - `RefreshScheduler` 从 stores 读取状态

**涉及文件：**
- 新增：`src/stores/*.ts`（8 个 store 文件）, `src/app/context-adapter.ts`
- 修改：`src/App.ts`, `src/app/app-context.ts`, `src/app/refresh-scheduler.ts`, `src/app/data-loader.ts`

**验证标准：**
- 所有应用状态通过 Zustand 管理
- React DevTools 可查看状态变化
- 现有功能不受影响

---

### 阶段 3：面板系统 React 化

**目标：** 将 Panel 基类和所有 130+ 面板子类迁移为 React 函数组件。

**具体任务：**

1. **创建通用面板 UI 组件**
   - `PanelShell.tsx` — 面板外壳（header, content, resize, collapse）
   - `PanelHeader.tsx` — 面板头部
   - `PanelTabs.tsx` — 面板标签页
   - `PanelResizeHandle.tsx` — 拖拽调整大小
   - `VirtualList.tsx` — 虚拟列表

2. **创建 `usePanel` Hook**
   - 管理 fetching, retry, collapsed, locked 状态
   - 面板可见性检测（IntersectionObserver）
   - AbortController 自动清理

3. **分 6 批迁移面板组件：**
   - **批次 A**（~20 个）：简单数据面板（FearGreed, MacroSignals, ETFFlows 等）
   - **批次 B**（~15 个）：新闻/情报面板（News, LiveNews, GdeltIntel, CII 等）
   - **批次 C**（~15 个）：市场/金融面板（Market, Prediction, StockAnalysis 等）
   - **批次 D**（~15 个）：基础设施/科技面板（InternetDisruptions, SupplyChain 等）
   - **批次 E**（~10 个）：Happy 变体面板
   - **批次 F**（~10 个）：复杂交互面板（CountryBrief, ChatAnalyst, RouteExplorer 等）

4. **innerHTML 迁移策略**
   - 简单列表 → `map()` + JSX
   - 复杂模板 → `dangerouslySetInnerHTML` + DOMPurify 过渡
   - 长期目标 → 全部声明式 JSX

**迁移模式：**
```typescript
// 旧：class XxxPanel extends Panel { setContent(html) }
// 新：
function XxxPanel() {
  const { data, fetching, error, refetch } = usePanelData(fetchXxx);
  return (
    <PanelShell id="xxx" title="...">
      {fetching ? <Skeleton /> : <XxxContent data={data} />}
    </PanelShell>
  );
}
```

**涉及文件：**
- 新增：`src/components/ui/*.tsx`, `src/hooks/usePanel.ts`
- 修改：130+ 个面板文件（从 class 改为 function component）

**验证标准：**
- 所有面板以 React 组件形式渲染
- Panel 基类废弃
- 面板通过 Zustand stores 获取数据

---

### 阶段 4：布局系统 React 化

**目标：** 将 PanelLayoutManager 和 App.renderLayout() 迁移为 React 布局组件。

**具体任务：**

1. **创建布局组件**
   - `AppShell.tsx` — 顶层布局容器
   - `Header.tsx` — 头部栏
   - `PanelGrid.tsx` — 面板网格（CSS Grid）
   - `PanelGridItem.tsx` — 单个面板网格包装
   - `BottomBar.tsx` — 底部状态栏

2. **迁移面板拖拽排序**
   - 使用原生 HTML5 drag API + React state
   - 面板顺序存储在 `panel-store.ts`

3. **迁移模态框系统**
   - 改为 React Portal + 条件渲染
   - 打开/关闭状态由 `ui-store.ts` 管理

4. **迁移横幅系统**
   - 改为 React 组件 + store 控制

5. **迁移 EventHandlerManager**
   - 全局键盘快捷键 → `useEffect` + `useCallback`
   - 窗口 resize/visibilitychange → hooks

**涉及文件：**
- 新增：`src/components/layout/*.tsx`
- 修改：`src/app/panel-layout.ts`, `src/app/event-handlers.ts`, `src/App.ts`

**验证标准：**
- 整个 UI 由 React 组件树渲染
- 布局响应式且支持面板拖拽排序
- 模态框/横幅正常工作

---

### 阶段 5：地图组件 React 化

**目标：** 将 DeckGLMap, GlobeMap, MapContainer 迁移为 React 组件。

**具体任务：**

1. **创建 React 地图组件**
   - `MapContainer.tsx` — 条件渲染（deckgl / globe / svg fallback）
   - `DeckGLMap.tsx` — React wrapper（useRef 持有 maplibregl/deck.gl 实例）
   - `GlobeMap.tsx` — React wrapper（useRef 持有 globe.gl 实例）
   - `MapFallback.tsx` — D3/SVG 移动端降级

2. **地图交互事件迁移**
   - 点击/hover/context menu → React 回调 + store

3. **图层更新机制**
   - `map-store` 的 layers 变化触发 `useEffect` 更新

4. **性能优化**
   - `React.memo` 严格隔离地图组件
   - `useMemo` 缓存 layer 配置
   - `useRef` 存储 layer 实例

**涉及文件：**
- 新增：`src/components/map/*.tsx`, `src/hooks/useMapLayers.ts`, `src/hooks/useMapViewport.ts`
- 修改：`src/stores/map-store.ts`

**验证标准：**
- 地图作为 React 组件嵌入布局
- 地图状态通过 Zustand 管理
- 地图交互正常，性能不退化

---

### 阶段 6：样式迁移（CSS → Tailwind CSS）

**目标：** 将现有 CSS 逐步替换为 Tailwind CSS 工具类。

**具体任务：**

1. **建立 Tailwind 主题映射**
   - CSS 变量 → Tailwind 主题 token（`--bg` → `bg-background` 等）
   - 保留 CSS 变量作为底层来源

2. **分批迁移：**
   - **批次 A**：`main.css` 全局布局 → Tailwind 工具类
   - **批次 B**：`panels.css` → PanelShell 组件 Tailwind 类
   - **批次 C**：特殊组件 CSS（map-context-menu, route-explorer 等）
   - **批次 D**：`rtl-overrides.css` → Tailwind RTL 插件

3. **迁移原则：**
   - 新 React 组件全部使用 Tailwind
   - 迁移后的面板组件同步替换 CSS
   - CSS 变量系统保留（主题切换机制不变）

**涉及文件：**
- 修改：`src/styles/*.css`（逐步精简）
- 修改：所有 React 组件文件

**验证标准：**
- 新组件全部使用 Tailwind CSS
- 旧 CSS 文件逐步精简
- 主题切换（dark/light/happy）正常工作
- RTL 支持正常

---

### 阶段 7：App.ts 拆解与 Tauri 代码清理

**目标：** 拆解 App.ts 上帝类，清理 Tauri 代码。

**具体任务：**

1. **拆解 App.ts**
   - `App.init()` → `bootstrapApp()`（服务初始化）+ `DashboardPage`（React 组件）
   - `App.destroy()` → React `useEffect` cleanup
   - `App.primeVisiblePanelData()` → `useDataRefresh` hook

2. **迁移 SearchManager / CountryIntelManager**
   - 改为 `useSearch` / `useCountryIntel` hooks

3. **清理 Tauri 代码**
   - 移除 `src/services/tauri-bridge.ts`, `desktop-updater.ts`, `desktop-readiness.ts`
   - 移除 `src/shims/child-process*.ts`
   - 从 `vite.config.ts` 移除 Tauri 配置
   - 从 `main.ts` 移除 Tauri 检测逻辑

4. **清理旧入口文件**
   - 移除 `src/settings-main.ts`, `src/settings-window.ts`（已迁移为 React Router 页面）
   - 移除 `src/live-channels-main.ts`, `src/live-channels-window.ts`（已迁移为 React Router 页面）

**涉及文件：**
- 修改：`src/App.ts`（大幅拆解）, `src/main.ts`
- 删除：`src/settings-main.ts`, `src/settings-window.ts`, `src/live-channels-main.ts`, `src/live-channels-window.ts`, Tauri 相关文件
- 修改：`vite.config.ts`

**验证标准：**
- App.ts 从 ~65KB 缩减到接近 0
- React Router 路由正常工作（/, /settings, /channels）
- Tauri 代码和旧入口文件完全移除
- 构建成功，所有功能正常

---

### 阶段 8：清理、优化与测试完善

**目标：** 清理遗留代码，优化性能，完善测试覆盖。

**具体任务：**

1. **清理遗留代码**
   - 移除 `dom-utils.ts` 中的 DOM 操作函数
   - 移除 `app-context.ts`（已被 stores 替代）
   - 移除 `context-adapter.ts`（不再需要）
   - 移除 `panel-layout.ts`, `event-handlers.ts`, `pending-panel-data.ts`
   - 清理所有 `document.querySelector` / `document.createElement`

2. **性能优化**
   - `React.lazy` + `Suspense` 面板代码分割
   - `useMemo` / `useCallback` 减少重渲染
   - 分析 bundle size（确保 deck.gl/maplibre 有效分 chunk）

3. **测试完善**
   - 单元测试：Zustand stores, hooks（vitest）
   - 组件测试：面板渲染/交互（@testing-library/react）
   - E2E 测试：迁移现有 Playwright 测试选择器
   - 视觉回归：保留截图对比

4. **Web Workers**
   - `analysis.worker.ts`, `ml.worker.ts` 保留
   - 确保与 React 组件通信正常

5. **PWA 更新**
   - 更新 Service Worker 缓存策略
   - 更新 `offline.html`

6. **CSP 收紧**
   - React 19 不需要 `unsafe-eval`
   - 收紧 `script-src` 策略

**涉及文件：**
- 删除：多个遗留文件
- 修改：`vite.config.ts`, `index.html`, `playwright.config.ts`
- 新增：测试文件

**验证标准：**
- 零遗留代码
- 所有测试通过
- Bundle size 与迁移前相当或更优
- PWA 功能正常
- 性能指标不退化

---

## 关键迁移模式

### Panel 基类 → React 组件 + Hook

```typescript
// 旧模式
class XxxPanel extends Panel {
  async fetchData() { ...; this.content.innerHTML = html; }
}

// 新模式
function XxxPanel() {
  const { data, fetching, refetch } = usePanelData(fetchXxx);
  return (
    <PanelShell id="xxx" title="...">
      {fetching ? <Skeleton /> : <XxxContent data={data} />}
    </PanelShell>
  );
}
```

### AppContext → Zustand Store

```typescript
// 旧：this.state.allNews = news;
// 新（组件内）：const allNews = useNewsStore(s => s.allNews);
// 新（服务层）：useNewsStore.getState().setAllNews(news);
```

### 地图组件 React 化

```tsx
function DeckGLMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layers = useMapStore(s => s.layers);

  useEffect(() => {
    const map = new maplibregl.Map({ container: containerRef.current!, ... });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    mapRef.current?.setProps({ layers: buildLayers(layers) });
  }, [layers]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

---

## 构建配置变更

### vite.config.ts

- 新增 `@vitejs/plugin-react` 插件
- 新增 React/Zustand `manualChunks` 分割
- 移除多入口点配置（settings.html, live-channels.html），改为单入口 index.html
- 移除 Tauri 相关配置和 child_process shims
- 保留 PWA、brotli、dev server proxies、多变体插件

### tsconfig.json

- 新增 `"jsx": "react-jsx"`
- 保留现有严格模式配置

### package.json

- 新增：react, react-dom, zustand, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, @tanstack/react-virtual
- 移除：preact, @tauri-apps/cli, dodopayments-checkout

---

## 风险与缓解措施

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| Bundle Size 膨胀（React ~45KB gzipped） | 高 | manualChunks 分割 React，利用浏览器缓存 |
| 地图组件性能退化 | 高 | React.memo + useRef 严格隔离，避免不必要重渲染 |
| 内存泄漏（AbortController/timer 清理） | 高 | useAbortController hook 强制使用 |
| innerHTML 迁移安全性 | 高 | useSafeHtml hook + DOMPurify |
| CSS 变量与 Tailwind 交互 | 中 | Tailwind v4 CSS 变量优先策略 |
| React Router SPA 迁移 | 中 | 删除 settings.html/live-channels.html，配置 Vercel SPA fallback 重写 |
| Web Workers 通信 | 中 | Vite worker 处理不变，更新 import 路径 |
| PWA Service Worker | 中 | vite-plugin-pwa 自动处理，需验证 |
| Clerk Auth 迁移 | 低 | 使用 ClerkProvider 包裹应用 |
| Convex 集成 | 低 | 逐步从直接调用改为 React hooks |
| Sentry 集成 | 低 | 使用 Sentry.ErrorBoundary |

---

## 假设与决策

1. **使用 React Router 单页应用**：移除多入口点架构（settings.html, live-channels.html），合并为单个 index.html 入口 + React Router 路由（/, /settings, /channels）
2. **保留 CSS 变量主题系统**：Tailwind 主题映射到 CSS 变量，不替换底层主题机制
3. **渐进式迁移**：每个阶段保持可发布状态，新旧代码共存
4. **services/ 层优先稳定**：确保数据层稳定后再迁移 UI 层
5. **地图组件核心逻辑不变**：仅添加 React wrapper，不重写 deck.gl/maplibre 交互逻辑
6. **不保留 Tauri 兼容性**：移除所有桌面端相关代码
7. **完全移除付费功能**：删除所有 Pro/订阅/门控代码，所有面板和功能对所有用户开放，无免费版限制
8. **使用 Subagent 并行加速**：每个阶段内尽可能拆分为独立子任务，使用多个 subagent 并行执行

---

## Subagent 并行执行策略

为加速重构工作，每个阶段内的独立子任务将拆分为多个 subagent 并行执行。以下是各阶段的并行策略：

### 阶段 0：移除付费功能（3 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 删除核心付费文件 + 修改核心应用文件 | 删除 11 个文件；修改 App.ts, app/*.ts, main.ts |
| **Agent B** | 清理组件中的付费代码 | 修改 20+ 个 components/*.ts 文件 |
| **Agent C** | 清理 CSS 样式 + locale 翻译键 + 配置文件 | 修改 styles/*.css, 21 个 locale 文件, config/*.ts, types/index.ts, package.json |

### 阶段 1：基础设施搭建（2 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 安装依赖 + 配置构建工具 | package.json, vite.config.ts, tsconfig.json, tailwind.config.ts |
| **Agent B** | 创建 React 骨架 + 路由配置 | react-main.tsx, pages/*.tsx, stores/app-store.ts, hooks/useTheme.ts, components/ui/PanelShell.tsx |

### 阶段 2：状态管理迁移（3 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 创建数据类 stores | news-store.ts, market-store.ts, intelligence-store.ts |
| **Agent B** | 创建 UI/配置类 stores | app-store.ts, panel-store.ts, map-store.ts, ui-store.ts, settings-store.ts |
| **Agent C** | 创建适配层 + 迁移数据加载 | context-adapter.ts, 修改 App.ts, data-loader.ts, refresh-scheduler.ts |

### 阶段 3：面板系统 React 化（6 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 迁移简单数据面板（批次 A ~20 个） | FearGreed, MacroSignals, ETFFlows 等 |
| **Agent B** | 迁移新闻/情报面板（批次 B ~15 个） | News, LiveNews, GdeltIntel, CII 等 |
| **Agent C** | 迁移市场/金融面板（批次 C ~15 个） | Market, Prediction, StockAnalysis 等 |
| **Agent D** | 迁移基础设施/科技面板（批次 D ~15 个） | InternetDisruptions, SupplyChain 等 |
| **Agent E** | 迁移 Happy 变体面板（批次 E ~10 个） | GoodThingsDigest, SpeciesComeback 等 |
| **Agent F** | 迁移复杂交互面板（批次 F ~10 个） | CountryBrief, ChatAnalyst, RouteExplorer 等 |

> **注意**：批次 A-F 之间完全独立（不同面板文件），可以安全并行。但所有批次共享 `PanelShell.tsx` 和 `usePanel.ts`，因此需要先由一个 agent 创建这些共享组件，然后 6 个 agent 并行迁移。

### 阶段 4：布局系统 React 化（2 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 创建布局组件 + 迁移面板拖拽 | AppShell, Header, PanelGrid, PanelGridItem, BottomBar |
| **Agent B** | 迁移模态框 + 横幅 + 事件处理 | SearchModal, SignalModal, BreakingNewsBanner, EventHandlerManager |

### 阶段 5：地图组件 React 化（2 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | React 化 DeckGLMap + MapContainer | DeckGLMap.tsx, MapContainer.tsx, useMapLayers.ts |
| **Agent B** | React 化 GlobeMap + MapFallback + MapPopup | GlobeMap.tsx, MapFallback.tsx, MapPopup.tsx, MapContextMenu.tsx |

### 阶段 6：样式迁移（4 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 迁移 main.css + panels.css | 全局布局和面板样式 → Tailwind |
| **Agent B** | 迁移 map-context-menu.css + route-explorer.css | 地图和路线探索器样式 → Tailwind |
| **Agent C** | 迁移 country-deep-dive.css + supply-chain-panel.css | 深度分析和供应链样式 → Tailwind |
| **Agent D** | 迁移 settings-window.css + rtl-overrides.css + happy-theme.css | 设置、RTL、Happy 主题样式 → Tailwind |

### 阶段 7：App.ts 拆解（2 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 拆解 App.ts + 迁移 SearchManager/CountryIntelManager | App.ts, search-manager.ts, country-intel.ts |
| **Agent B** | 清理 Tauri 代码 + 旧入口文件 | 删除 tauri-bridge.ts, desktop-*.ts, settings-*.ts, live-channels-*.ts |

### 阶段 8：清理优化（3 个 subagent 并行）

| Subagent | 任务 | 涉及文件 |
|----------|------|---------|
| **Agent A** | 清理遗留代码 + 性能优化 | 删除遗留文件，添加 React.lazy, useMemo |
| **Agent B** | 测试完善 | 新增 vitest 单元测试，迁移 Playwright E2E 测试 |
| **Agent C** | PWA + CSP 更新 | vite.config.ts PWA 配置, index.html CSP, offline.html |

### Subagent 协作规则

1. **依赖管理**：每个阶段内的 subagent 必须等前置阶段完成后才能启动
2. **共享文件冲突**：同一阶段内修改不同文件的 subagent 可以并行；修改相同文件的必须串行
3. **验证点**：每个阶段所有 subagent 完成后，运行 `npm run build` + `npm run test:e2e` 验证
4. **错误处理**：任一 subagent 失败时，暂停该阶段所有 subagent，修复后重新执行

---

## 验证步骤

1. **阶段 0 完成后**：`npm run build` 成功，无付费相关代码残留，所有面板无门控
2. **阶段 1 完成后**：验证 React 挂载点不影响现有功能
3. **每个阶段完成后**：运行完整 E2E 测试套件
4. **阶段 3 完成后**：验证所有面板渲染正确
5. **阶段 5 完成后**：验证地图交互和性能
6. **阶段 7 完成后**：验证构建产物、bundle size、PWA
7. **阶段 8 完成后**：全面视觉回归测试、性能基准测试

---

## 实施进度（截至当前）

### ✅ 已完成的阶段

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段 0 | ✅ 完成 | 移除付费/Pro/订阅功能。修改 30+ 文件，清理 CSS/locale/配置，移除 npm 依赖 |
| 阶段 1 | ✅ 完成 | 安装 React 19 + Zustand 5 + React Router 7 + Tailwind CSS 4。更新 vite.config.ts、tsconfig.json。创建 React 入口和页面骨架 |
| 阶段 2 | ✅ 完成 | 创建 8 个 Zustand stores（app, news, market, intelligence, panel, map, ui, settings）+ barrel export |
| 阶段 3 | ✅ 基础设施完成 | 创建 usePanel hook、useDataFetch hook、Skeleton 组件、PanelShell 组件。130+ 面板的实际迁移待后续迭代 |
| 阶段 4 | ✅ 完成 | 创建 5 个布局组件（AppShell, Header, PanelGrid, PanelGridItem, BottomBar）|
| 阶段 5 | ✅ 完成 | 创建 4 个地图组件（MapContainer, MapToolbar, MapPopup, MapContextMenu）|
| 阶段 6 | ✅ 完成 | 配置 Tailwind CSS v4 主题，映射 CSS 变量到 Tailwind tokens |

### ⏳ 部分完成 / 待后续迭代

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段 7 | ⏳ 部分完成 | Tauri 相关文件（tauri-bridge.ts, desktop-updater.ts, desktop-readiness.ts, child-process shims）被 9 个核心文件引用，需要逐步清理条件分支 |
| 阶段 8 | ⏳ 待执行 | 遗留代码清理、性能优化、测试完善 |

### 已创建的新文件清单

**React 入口和页面：**
- `src/react-main.tsx` — React 应用入口（BrowserRouter + 路由）
- `src/pages/DashboardPage.tsx` — 主仪表盘页面
- `src/pages/SettingsPage.tsx` — 设置页面
- `src/pages/LiveChannelsPage.tsx` — 频道管理页面

**Zustand Stores（8 个）：**
- `src/stores/app-store.ts` — 全局应用状态
- `src/stores/news-store.ts` — 新闻数据
- `src/stores/market-store.ts` — 市场数据
- `src/stores/intelligence-store.ts` — 情报缓存
- `src/stores/panel-store.ts` — 面板配置/布局
- `src/stores/map-store.ts` — 地图状态
- `src/stores/ui-store.ts` — UI 状态
- `src/stores/settings-store.ts` — 用户设置
- `src/stores/index.ts` — barrel export

**Hooks（3 个）：**
- `src/hooks/usePanel.ts` — 面板通用逻辑
- `src/hooks/useDataFetch.ts` — 数据获取
- `src/hooks/useTheme.ts` — 主题切换
- `src/hooks/index.ts` — barrel export

**UI 组件（3 个）：**
- `src/components/ui/PanelShell.tsx` — 面板壳组件
- `src/components/ui/Skeleton.tsx` — 骨架屏
- `src/components/ui/index.ts` — barrel export

**布局组件（5 个）：**
- `src/components/layout/AppShell.tsx` — 顶层布局
- `src/components/layout/Header.tsx` — 头部栏
- `src/components/layout/PanelGrid.tsx` — 面板网格
- `src/components/layout/PanelGridItem.tsx` — 网格项
- `src/components/layout/BottomBar.tsx` — 底部栏
- `src/components/layout/index.ts` — barrel export

**地图组件（4 个）：**
- `src/components/map/MapContainer.tsx` — 地图容器
- `src/components/map/MapToolbar.tsx` — 地图工具栏
- `src/components/map/MapPopup.tsx` — 地图弹窗
- `src/components/map/MapContextMenu.tsx` — 右键菜单
- `src/components/map/index.ts` — barrel export

**样式：**
- `src/styles/tailwind.css` — Tailwind CSS v4 主题配置

### 后续迭代建议

1. **面板迁移（阶段 3 续）**：逐个将 130+ 面板从 class Panel 改为 React 函数组件 + usePanel hook。建议按批次 A-F 分 6 轮迭代。

2. **App.ts 拆解（阶段 7 续）**：将 App.ts 的 init() 方法拆分为独立的服务初始化函数，将 renderLayout() 迁移到 React AppShell 组件。

3. **Tauri 清理（阶段 7 续）**：逐步将 `if (isDesktopRuntime())` 条件分支替换为平台无关的实现，然后删除 Tauri 相关文件。

4. **样式迁移（阶段 6 续）**：新 React 组件使用 Tailwind 工具类，旧组件的 CSS 在迁移时同步替换。

5. **测试（阶段 8）**：为 Zustand stores 添加 vitest 单元测试，为 React 组件添加 @testing-library/react 测试。
