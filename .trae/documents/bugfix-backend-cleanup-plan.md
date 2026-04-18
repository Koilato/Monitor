# Bug修复 + 后端清理 + 面板挂载 实施计划

## 概要

修复5个关键Bug，清理残留后端API调用，确保面板正确挂载到DOM。用户要求：保留API端点结构，使用mock数据，后续自行实现业务逻辑。

## 当前状态分析

### Bug 1: MapContainer 回调属性名不匹配（高优先级）
- **文件**: `src/components/MapContainer.ts` 第1027行
- **问题**: `(this.deckGLMap as any)._onCountryHover = callback` — 属性名错误
- **正确**: DeckGLMap 的 setter 是 `onCountryHover`，内部字段是 `_onCountryHoverCallback`
- **影响**: 悬停回调永远不会被触发

### Bug 2: DeckGLMap onCountryClick 守卫条件错误（高优先级）
- **文件**: `src/components/DeckGLMap.ts` 第6356行
- **问题**: `if (!this.onCountryClick) return;` — 检查的是点击回调而非悬停回调
- **影响**: 如果没有设置 onCountryClick，整个国家悬停检测逻辑被跳过

### Bug 3: GlobeMap 缺少悬停功能（中优先级）
- **文件**: `src/components/GlobeMap.ts`
- **问题**: 没有 `setOnCountryHover`、`setHoverFlows`、国家悬停检测、悬停弧线渲染
- **现有资源**: `getCountryAtCoordinates` 已导入，`this.globe.toGlobeCoords(x,y)` 可用，`flushArcs()` 可参考

### Bug 4: 面板 DOM 挂载时序问题（高优先级）
- **文件**: `src/app/panel-layout.ts` 第389-426行
- **问题**: 通用挂载循环（389-395行）在面板实例化（419-422行）之前执行，导致面板创建后未挂载到DOM
- **影响**: CountryInfoPanel 和 RiskIndicatorsPanel 在页面上不可见

### Bug 5: 残留后端 API 调用（低优先级）
- **范围**: 49个文件中有97处 gRPC/Connect-RPC 调用，24个文件中有27处 REST fetch 调用
- **策略**: 这些服务文件大部分已不被任何组件引用（面板已删除），不会在运行时执行。只需确保编译通过即可，不需要逐个修改。

---

## 实施步骤

### 步骤 1: 修复 MapContainer 回调属性名（Bug 1）

**文件**: `src/components/MapContainer.ts`

**修改内容**:
- 第1027行: `(this.deckGLMap as any)._onCountryHover = callback` → `this.deckGLMap.onCountryHover = callback`
- 同时在 `setOnCountryHover` 方法中添加对 `globeMap` 的代理调用
- 在 `setHoverFlows` 方法中添加对 `globeMap` 的代理调用（使用公共方法而非 `as any`）

```typescript
public setOnCountryHover(callback: (country: { code: string; name: string } | null) => void): void {
  if (this.deckGLMap) {
    this.deckGLMap.onCountryHover = callback;
  }
  if (this.globeMap) {
    this.globeMap.setOnCountryHover(callback);
  }
}

public setHoverFlows(flows: Array<{srcCountry: string; destCountry: string; volume: number; label?: string}>): void {
  if (this.deckGLMap) {
    this.deckGLMap.setHoverFlows(flows);
  }
  if (this.globeMap) {
    this.globeMap.setHoverFlows(flows);
  }
}
```

---

### 步骤 2: 修复 DeckGLMap 守卫条件（Bug 2）

**文件**: `src/components/DeckGLMap.ts`

**修改内容**:
- 第6356行: `if (!this.onCountryClick) return;` → `if (!this._onCountryHoverCallback && !this.onCountryClick) return;`

这样即使没有设置 onCountryClick，只要有悬停回调，悬停检测逻辑也能执行。

---

### 步骤 3: 修复面板 DOM 挂载（Bug 4）

**文件**: `src/app/panel-layout.ts`

**修改内容**:
在面板实例化之后（第422行之后），手动将面板 DOM 元素挂载到 `panelsGrid`：

```typescript
// Country info & risk indicator panels + hover handler
const infoPanel = new CountryInfoPanel();
const riskPanel = new RiskIndicatorsPanel();
this.ctx.panels['country-info'] = infoPanel;
this.ctx.panels['risk-indicators'] = riskPanel;

// 挂载面板到 DOM
const panelsGrid = document.getElementById('panelsGrid');
if (panelsGrid) {
  if (!infoPanel.getElement().parentElement) {
    panelsGrid.appendChild(infoPanel.getElement());
  }
  if (!riskPanel.getElement().parentElement) {
    panelsGrid.appendChild(riskPanel.getElement());
  }
}

if (this.ctx.map) {
  new HoverHandler(this.ctx.map, infoPanel, riskPanel);
}
```

---

### 步骤 4: GlobeMap 添加悬停功能（Bug 3）

**文件**: `src/components/GlobeMap.ts`

**4a. 添加属性声明**（在类属性区域，约第440行附近）:
```typescript
private _onCountryHoverCallback: ((country: { code: string; name: string } | null) => void) | null = null;
private _hoverFlows: Array<{srcCountry: string; destCountry: string; volume: number; label?: string}> = [];
private _lastHoveredCountry: { code: string; name: string } | null = null;
```

**4b. 添加公共方法**（在 `setOnCountryClick` 附近，约第2665行）:
```typescript
public setOnCountryHover(callback: (country: { code: string; name: string } | null) => void): void {
  this._onCountryHoverCallback = callback;
}

public setHoverFlows(flows: Array<{srcCountry: string; destCountry: string; volume: number; label?: string}>): void {
  this._hoverFlows = flows;
  this.flushHoverArcs();
}
```

**4c. 添加 mousemove 悬停检测**（在 `initGlobe()` 的 canvas 事件绑定区域，约第703行）:
在现有的 `mousemove` 监听器旁边添加新的监听器，使用 `this.globe.toGlobeCoords()` + `getCountryAtCoordinates()` 检测国家，带 150ms 节流。

**4d. 添加悬停弧线渲染**:
在 `initGlobe()` 中配置第二组 arcs 图层（hover-arcs），使用不同颜色（如亮黄色）和更高透明度。添加 `flushHoverArcs()` 方法，将 `_hoverFlows` 转换为坐标格式并渲染。

---

### 步骤 5: 清理残留后端调用（Bug 5）

**策略**: 分两步处理

**5a. 删除不再被引用的服务文件**:
检查哪些服务文件已无任何 import 引用（因为面板组件已删除），直接删除这些文件。预计可删除 30+ 个服务文件。

**5b. 保留被引用的服务文件，添加 mock 回退**:
对于仍被 MapContainer/DeckGLMap/GlobeMap/MapPopup 等核心组件引用的服务，保留文件但确保所有 fetch 调用有 mock 回退（try-catch + 返回空数据）。

**注意**: `country-flows.ts` 和 `country-risk.ts` 已有 mock 回退机制，无需修改。

---

### 步骤 6: 验证

1. 运行 `npx tsc --noEmit` 确认无 TypeScript 编译错误
2. 运行 `npm run build` 确认构建成功
3. 检查控制台无运行时错误

---

## 假设与决策

1. **GlobeMap 悬停弧线**: 使用 globe.gl 的第二组 arcs 图层，与现有贸易路线弧线分开管理
2. **后端清理策略**: 优先删除无用文件而非逐个修改，减少工作量
3. **面板挂载位置**: 挂载到 `panelsGrid`（侧边栏），与通用挂载循环一致
4. **Mock 数据**: `country-flows.ts` 和 `country-risk.ts` 的 mock 数据已足够，不需要扩展

## 验证步骤

1. TypeScript 编译无错误
2. Vite 构建成功
3. DeckGL 地图：鼠标悬停国家时显示箭头和面板数据
4. Globe 地图：鼠标悬停国家时显示箭头和面板数据
5. 面板在页面上可见
6. 无残留后端 API 请求（检查 Network 面板）
