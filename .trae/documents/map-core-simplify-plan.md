# World Monitor 简化重构计划 — 以地图为核心的定制应用

## 概述

将 World Monitor 从一个包含 130+ 面板、196 个 API 的复杂监控平台，简化为一个**以地图为核心**的定制应用。保留 DeckGL 平面地图和 GlobeMap 3D 地球（右上角切换），鼠标悬停国家时显示箭头和风险指标面板。

## 当前状态

- 已有 DeckGL 平面地图 + GlobeMap 3D 地球，MapContainer 统一调度
- 已有国家悬停机制（`DeckGLMap.setupCountryHover()`）
- 已有 ArcLayer 弧线绘制模式（`createTradeRoutesLayer`）
- 已有国家几何数据（`country-geometry.ts`）
- 已完成 React 19 + Zustand 5 基础设施 + 中文化

## 用户需求

1. 保留两种地图，右上角悬浮切换开关
2. 删除绝大部分面板，只保留地图 + 地图下方两种面板
3. 鼠标悬停国家时查表，显示所有指向该国的箭头
4. 两种面板：简单文本行 / 风险指标（风险等级 + 供应链 + 自定义指标）
5. 先做前端 mock 数据，预留后端 API 接口
6. 后端端点格式：`{国家1(目的), 国家2(源), 时间, 其余信息}`

---

## 阶段 1：删除不需要的面板和组件

### 1.1 删除面板组件文件（~100 个）

删除 `src/components/` 下所有非地图面板组件，保留：
- `Panel.ts` — 基类
- `DeckGLMap.ts` — 平面地图
- `GlobeMap.ts` — 3D 地球
- `MapContainer.ts` — 地图容器
- `Map.ts` — SVG 回退
- `MapPopup.ts` — 地图弹窗
- `MapContextMenu.ts` — 右键菜单
- `BreakingNewsBanner.ts` — 突发新闻横幅（可选）
- `AuthHeaderWidget.ts` / `AuthLauncher.ts` — 认证（可选）

删除的文件包括但不限于：NewsPanel, LiveNewsPanel, MarketPanel, EconomicPanel, CIIPanel, CascadePanel, MilitaryCorrelationPanel, EscalationCorrelationPanel, EconomicCorrelationPanel, DisasterCorrelationPanel, SupplyChainPanel, TradePolicyPanel, CountryDeepDivePanel, SearchModal, SignalModal, StoryModal, UnifiedSettings 等 ~100 个文件。

### 1.2 删除 RouteExplorer 目录

```
src/components/RouteExplorer/ — 整个目录删除
```

### 1.3 修改 `src/components/index.ts`

精简导出为只保留地图相关组件。

### 1.4 修改 `src/config/panels.ts`

将 `FULL_PANELS` 精简为 3 个：
```typescript
map: { name: 'Global Map', enabled: true, priority: 1 },
'country-info': { name: 'Country Info', enabled: true, priority: 1 },
'risk-indicators': { name: 'Risk Indicators', enabled: true, priority: 1 },
```

### 1.5 修改 `src/app/panel-layout.ts`

- `renderLayout()`: 简化 HTML，保留 header（logo + 时钟 + 地图切换按钮），移除搜索/全屏/移动端菜单，地图下方改为两个面板容器
- `createPanels()`: 删除所有面板创建，只创建两个新面板
- 移除已删除组件的 import

### 1.6 修改 `src/app/app-context.ts`

精简 AppContext 接口，移除不需要的字段，保留地图和悬停相关字段。

### 1.7 修改 `src/App.ts`

精简 `init()`，移除与已删除面板相关的 Phase 逻辑，保留地图初始化和国家几何预加载。

### 1.8 修改 `src/app/data-loader.ts` + `src/app/event-handlers.ts`

删除面板数据加载和面板事件处理，只保留地图相关逻辑。

### 验证
- `npx tsc --noEmit` 编译通过
- `npm run dev` 显示地图 + 空白面板区域
- 2D/3D 切换正常

---

## 阶段 2：新建两种信息面板

### 2.1 新建 `src/components/CountryInfoPanel.ts`

简单文本面板，继承 Panel 基类，提供 `setContent(text)` 和 `clear()` 方法。

### 2.2 新建 `src/components/RiskIndicatorsPanel.ts`

风险指标面板，显示：
- 风险等级评分条（0-100，带颜色：绿/黄/橙/红）
- 供应链指数
- 自定义指标列表（动态数量）

### 2.3 修改布局 HTML

在 `panel-layout.ts` 中添加两个面板的挂载点：
```html
<div class="map-bottom-panels">
  <div id="countryInfoPanel" class="bottom-panel"></div>
  <div id="riskIndicatorsPanel" class="bottom-panel"></div>
</div>
```

### 验证
- 编译通过
- 两个面板在地图下方正确渲染

---

## 阶段 3：实现国家悬停交互 + 箭头显示

### 3.1 新建 `src/services/country-flows.ts`

数据类型 + mock 数据 + API 预留：
```typescript
interface CountryFlow {
  destCountry: string;  // 目的国 ISO2
  srcCountry: string;   // 源国 ISO2
  time: string;
  flowType: string;
  volume: number;
  label?: string;
}
async function fetchFlowsToCountry(destCountry: string): Promise<CountryFlow[]>
```

### 3.2 新建 `src/services/country-risk.ts`

风险数据类型 + mock + API 预留：
```typescript
interface CountryRiskData {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  supplyChainIndex: number;
  customMetrics: Array<{ name: string; value: number; unit?: string }>;
}
async function fetchCountryRisk(countryCode: string): Promise<CountryRiskData | null>
```

### 3.3 新建 `src/services/country-centroids.ts`

从 country-geometry.ts 的 bbox 计算国家中心点坐标，用于弧线绘制。

### 3.4 修改 `src/components/DeckGLMap.ts`

- 添加 `onCountryHover` 回调属性
- 修改 `setupCountryHover()`，在悬停国家变化时触发回调
- 新增 `setHoverFlows()` 方法
- 新增 `createHoverFlowsArcLayer()` 方法（复用 `createTradeRoutesLayer` 的 ArcLayer 模式）
- 在 `render()` 的 layers 数组中添加悬停箭头层

### 3.5 修改 `src/components/GlobeMap.ts`

- 添加 `setOnCountryHover` 回调
- 添加 `setHoverFlows()` 方法
- 在 globe.gl 的 `arcsData` 中混入悬停箭头数据

### 3.6 修改 `src/components/MapContainer.ts`

添加代理方法 `setOnCountryHover()` 和 `setHoverFlows()`。

### 验证
- 悬停国家时文本面板显示国家名称
- 地图上出现指向该国的弧线箭头
- 鼠标离开时弧线消失

---

## 阶段 4：面板数据联动

### 4.1 新建 `src/app/hover-handler.ts`

悬停事件协调器，联动地图和面板：
```typescript
class HoverHandler {
  constructor(map, infoPanel, riskPanel) {
    map.setOnCountryHover(async (country) => {
      if (!country) { clear all; return; }
      const [flows, risk] = await Promise.all([
        fetchFlowsToCountry(country.code),
        fetchCountryRisk(country.code),
      ]);
      infoPanel.setContent(`${country.name} (${country.code})`);
      map.setHoverFlows(flows);
      if (risk) riskPanel.update(risk);
    });
  }
}
```

### 4.2 在 `panel-layout.ts` 的 `createPanels()` 中初始化 HoverHandler

### 验证
- 悬停中国时，文本面板显示 "China (CN)"
- 风险面板显示评分和指标
- 地图显示从美国、日本等指向中国的弧线
- 鼠标移开后一切恢复默认

---

## 阶段 5：预留后端 API + 清理

### 5.1 修改数据服务

`country-flows.ts` 和 `country-risk.ts` 支持 `VITE_API_BASE` 环境变量切换 mock/real API。

### 5.2 清理残留

- 删除 `src/services/` 下不再使用的服务文件
- 精简 variant 配置
- 清理 data-loader、event-handlers 中的残留代码

### 5.3 更新中文化

在 `zh.json` 中添加新面板翻译。

### 验证
- `npx tsc --noEmit` 零错误
- `npm run build` 构建成功
- 设置 `VITE_API_BASE` 后可切换到真实 API

---

## 关键架构决策

1. **复用现有悬停机制**：DeckGLMap.setupCountryHover() 已能检测国家悬停，只需添加回调
2. **复用 ArcLayer 模式**：createTradeRoutesLayer() 提供完整范式
3. **MapContainer 代理模式**：遵循现有架构
4. **Mock 优先**：通过 VITE_API_BASE 环境变量控制
5. **渐进式删除**：每步保持编译通过

## 风险

1. GlobeMap 弧线实现方式与 DeckGLMap 不同（globe.gl arcsData vs deck.gl ArcLayer）
2. 大量文件删除建议在 git 分支上操作
3. MapLayers 类型中的图层开关可能需要精简
