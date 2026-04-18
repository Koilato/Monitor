# Bug 修复 + 后端清理 + 面板挂载修复计划

## 概述

检查发现 5 个关键 bug 需要修复，同时需要清理残留后端 API 调用。

## 当前 Bug 清单

### Bug 1: MapContainer 悬停回调赋值到错误属性名（严重）
- **文件**: `src/components/MapContainer.ts:1027`
- **问题**: `(this.deckGLMap as any)._onCountryHover = callback` 赋值到了 `_onCountryHover`，但 DeckGLMap 实际使用的是 `_onCountryHoverCallback`（通过 setter `set onCountryHover()`）
- **影响**: 悬停国家时回调永远不会触发，面板和弧线不会显示
- **修复**: 改为 `this.deckGLMap.onCountryHover = callback`

### Bug 2: DeckGLMap setupCountryHover 有 onCountryClick 守卫（严重）
- **文件**: `src/components/DeckGLMap.ts:6356`
- **问题**: `if (!this.onCountryClick) return;` 导致如果未注册国家点击回调，整个悬停检测被跳过
- **影响**: 即使 Bug 1 修复，悬停仍然不会工作
- **修复**: 移除该守卫，或改为 `if (!this.onCountryClick && !this._onCountryHoverCallback) return;`

### Bug 3: GlobeMap 完全缺少悬停和弧线功能（功能缺失）
- **文件**: `src/components/GlobeMap.ts`
- **问题**: GlobeMap 没有 `setOnCountryHover`、`setHoverFlows` 方法，没有国家悬停检测逻辑
- **影响**: 切换到 3D 地球时，所有悬停交互失效
- **修复**: 在 GlobeMap 中添加基本的国家悬停检测和弧线绘制

### Bug 4: CountryInfoPanel 和 RiskIndicatorsPanel 未挂载到 DOM（严重）
- **文件**: `src/app/panel-layout.ts:303-320`
- **问题**: `applyPanelSettings()` 只遍历 `this.ctx.panelSettings` 中已有的 key。但 `country-info` 和 `risk-indicators` 是在 `applyPanelSettings()` 之后才注册到 `this.ctx.panels`（第 421-422 行），且 `panelSettings` 中可能没有这两个 key
- **影响**: 面板虽然被创建了，但不会被挂载到 DOM 中显示
- **修复**: 在 `createPanels()` 中，创建面板后手动将其挂载到 `#mapBottomGrid` 或 `#panelsGrid` 容器中

### Bug 5: 残留后端 API 调用
- **问题**: `src/services/` 下仍有大量直接调用后端 API 的服务文件（约 99 处 fetch 调用）
- **影响**: 页面加载时会发起大量注定失败的 API 请求，产生网络错误和控制台警告
- **修复**: 清理不需要的服务文件，或将其改为 mock/no-op

---

## 修复计划

### 步骤 1: 修复 Bug 1 — MapContainer 回调属性名
**文件**: `src/components/MapContainer.ts`
- 将 `(this.deckGLMap as any)._onCountryHover = callback` 改为 `this.deckGLMap.onCountryHover = callback`

### 步骤 2: 修复 Bug 2 — 移除 onCountryClick 守卫
**文件**: `src/components/DeckGLMap.ts`
- 将 `if (!this.onCountryClick) return;` 改为 `if (!this.onCountryClick && !this._onCountryHoverCallback) return;`

### 步骤 3: 修复 Bug 4 — 面板 DOM 挂载
**文件**: `src/app/panel-layout.ts`
- 在 `createPanels()` 中，创建面板后手动挂载到 DOM：
```typescript
const infoPanel = new CountryInfoPanel();
const riskPanel = new RiskIndicatorsPanel();
// 手动挂载到 panelsGrid
const panelsGrid = document.getElementById('panelsGrid');
if (panelsGrid) {
  panelsGrid.appendChild(infoPanel.el);
  panelsGrid.appendChild(riskPanel.el);
}
```

### 步骤 4: 修复 Bug 3 — GlobeMap 悬停和弧线（基础实现）
**文件**: `src/components/GlobeMap.ts`
- 添加 `_onCountryHoverCallback` 字段
- 添加 `set onCountryHover()` setter
- 添加 `setHoverFlows()` 方法
- 在 globe 初始化后添加鼠标移动事件监听，通过 `globe.pointToGeo()` 转换坐标，然后查表获取国家代码
- 在 `flushArcs()` 中混入悬停弧线数据

### 步骤 5: 修复 Bug 5 — 清理残留后端 API 调用
**文件**: 多个 services 文件
- 删除 `src/services/` 下不再使用的服务文件（约 60-80 个）
- 保留核心服务：runtime.ts, rpc-client.ts, premium-fetch.ts, i18n.ts, storage.ts, country-geometry.ts, country-flows.ts, country-risk.ts, country-centroids.ts
- 保留地图相关：military-flights.ts, satellites.ts（如果地图需要）
- 将 data-loader.ts 中的 API 调用全部改为 no-op

### 步骤 6: 验证
- `npx tsc --noEmit` 编译通过
- `npm run dev` 启动后：
  - DeckGLMap 模式下悬停国家显示面板和弧线
  - GlobeMap 模式下悬停国家显示面板和弧线
  - 两个面板正确挂载在地图下方
  - 控制台无 API 请求错误
