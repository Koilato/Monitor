# Map Rendering Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split 2D and 3D map rendering into separate, normalized config paths and make the 2D map a single-world, continuously zoomable, free-pan view while keeping mocked data intact.

**Architecture:** Keep `App.tsx` as page orchestration only, keep `MapViewport.tsx` as the mode switch and shared overlay shell, and move renderer-specific defaults into separate 2D and 3D config modules. The 2D renderer will explicitly disable world copies, allow fractional zoom, and avoid any duplicated-world rendering tricks. The 3D renderer stays on its own config path and continues to own camera and globe styling.

**Tech Stack:** React 19, TypeScript, Vite, MapLibre GL, deck.gl, Globe.gl, Node `tsx --test` for lightweight client unit tests.

---

### Task 1: Create separated map config modules and client tests

**Files:**
- Create: `client/src/lib/map-2d-config.ts`
- Create: `client/src/lib/map-3d-config.ts`
- Modify: `client/src/lib/types.ts`
- Create: `client/test/map-config.test.ts`
- Modify: `client/package.json`

- [ ] **Step 1: Add the 2D and 3D config modules**

Create `client/src/lib/map-2d-config.ts` with:

```ts
export interface TwoDMapConfig {
  centerLng: number;
  centerLat: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  contentPaddingX: number;
}

export const DEFAULT_TWO_D_MAP_CONFIG: TwoDMapConfig = {
  centerLng: 0,
  centerLat: 0,
  zoom: 0,
  minZoom: -6,
  maxZoom: 6,
  contentPaddingX: 0,
};

export function normalizeTwoDMapConfig(input: Partial<TwoDMapConfig>): TwoDMapConfig {
  const minZoom = Math.max(-6, input.minZoom ?? DEFAULT_TWO_D_MAP_CONFIG.minZoom);
  const maxZoom = Math.max(minZoom, input.maxZoom ?? DEFAULT_TWO_D_MAP_CONFIG.maxZoom);
  const zoom = Math.min(Math.max(input.zoom ?? DEFAULT_TWO_D_MAP_CONFIG.zoom, minZoom), maxZoom);

  return {
    centerLng: Math.min(Math.max(input.centerLng ?? DEFAULT_TWO_D_MAP_CONFIG.centerLng, -180), 180),
    centerLat: Math.min(Math.max(input.centerLat ?? DEFAULT_TWO_D_MAP_CONFIG.centerLat, -90), 90),
    zoom,
    minZoom,
    maxZoom,
    contentPaddingX: Math.max(0, input.contentPaddingX ?? DEFAULT_TWO_D_MAP_CONFIG.contentPaddingX),
  };
}
```

Create `client/src/lib/map-3d-config.ts` with:

```ts
export interface ThreeDMapConfig {
  povLng: number;
  povLat: number;
  povAltitude: number;
}

export const DEFAULT_THREE_D_MAP_CONFIG: ThreeDMapConfig = {
  povLng: 105,
  povLat: 24,
  povAltitude: 2.45,
};

export function normalizeThreeDMapConfig(input: Partial<ThreeDMapConfig>): ThreeDMapConfig {
  return {
    povLng: Math.min(Math.max(input.povLng ?? DEFAULT_THREE_D_MAP_CONFIG.povLng, -180), 180),
    povLat: Math.min(Math.max(input.povLat ?? DEFAULT_THREE_D_MAP_CONFIG.povLat, -90), 90),
    povAltitude: Math.max(0.2, input.povAltitude ?? DEFAULT_THREE_D_MAP_CONFIG.povAltitude),
  };
}
```

Update `client/src/lib/types.ts` so it keeps the shared hover / popup / map-view props types, but removes the map default constants from this file.

- [ ] **Step 2: Add a client test runner**

Add this script to `client/package.json`:

```json
{
  "scripts": {
    "test": "tsx --test test/**/*.test.ts"
  }
}
```

Add `client/test/map-config.test.ts` with assertions that:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TWO_D_MAP_CONFIG, normalizeTwoDMapConfig } from '../src/lib/map-2d-config';
import { DEFAULT_THREE_D_MAP_CONFIG, normalizeThreeDMapConfig } from '../src/lib/map-3d-config';

test('2D config keeps fractional zoom and clamps bounds', () => {
  const config = normalizeTwoDMapConfig({
    zoom: 2.75,
    minZoom: -4,
    maxZoom: 5,
    contentPaddingX: -12,
  });

  assert.equal(config.zoom, 2.75);
  assert.equal(config.minZoom, -4);
  assert.equal(config.maxZoom, 5);
  assert.equal(config.contentPaddingX, 0);
  assert.equal(DEFAULT_TWO_D_MAP_CONFIG.zoom, 0);
});

test('3D config normalizes camera defaults', () => {
  const config = normalizeThreeDMapConfig({
    povLng: 220,
    povLat: -120,
    povAltitude: 0.05,
  });

  assert.equal(config.povLng, 180);
  assert.equal(config.povLat, -90);
  assert.equal(config.povAltitude, 0.2);
  assert.equal(DEFAULT_THREE_D_MAP_CONFIG.povAltitude, 2.45);
});
```

- [ ] **Step 3: Run the new client tests**

Run: `npm run test --workspace client`

Expected: pass with the new config tests.

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/src/lib/types.ts client/src/lib/map-2d-config.ts client/src/lib/map-3d-config.ts client/test/map-config.test.ts
git commit -m "refactor: split map config modules"
```

### Task 2: Rework the 2D renderer into a single-world, free-pan view

**Files:**
- Modify: `client/src/components/TwoDMap.tsx`
- Modify: `client/src/styles/map-2d.css`

- [ ] **Step 1: Replace 2D renderer imports with the new config module**

Import `DEFAULT_TWO_D_MAP_CONFIG` and `normalizeTwoDMapConfig` from `client/src/lib/map-2d-config.ts` instead of reading 2D defaults from `client/src/lib/types.ts`.

- [ ] **Step 2: Disable wrapped world rendering**

Update the `maplibregl.Map` initialization so the 2D renderer uses:

```ts
const map = new maplibregl.Map({
  container: containerRef.current,
  style: MAP_STYLE,
  center: [DEFAULT_TWO_D_MAP_CONFIG.centerLng, DEFAULT_TWO_D_MAP_CONFIG.centerLat],
  zoom: DEFAULT_TWO_D_MAP_CONFIG.zoom,
  minZoom: normalizedConfig.minZoom,
  maxZoom: normalizedConfig.maxZoom,
  renderWorldCopies: false,
  attributionControl: false,
});
```

Keep drag pan and wheel zoom enabled, and do not set `maxBounds`.

- [ ] **Step 3: Keep hover / threat / arcs behavior intact**

Preserve the existing layer setup, hover filters, and deck.gl overlays, but make sure they read from the normalized config object rather than directly from the old shared debug settings object.

- [ ] **Step 4: Update 2D CSS to match the single-world presentation**

Keep the 2D background visually consistent and avoid any CSS that implies repeating tiles or wrapped world copies. Ensure the 2D surface still fills its container and remains smooth during pan / zoom.

- [ ] **Step 5: Run the client build**

Run: `npm run build --workspace client`

Expected: the 2D renderer compiles and the map still loads without world wrapping.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TwoDMap.tsx client/src/styles/map-2d.css
git commit -m "refactor: make 2d map single-world"
```

### Task 3: Separate 3D config and keep viewport wiring thin

**Files:**
- Modify: `client/src/components/Globe3DMap.tsx`
- Modify: `client/src/components/MapViewport.tsx`
- Modify: `client/src/components/MapDebugPanel.tsx`
- Modify: `client/src/hooks/useMapDebugSettings.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Move 3D defaults to the 3D config module**

Update `Globe3DMap.tsx` to import `DEFAULT_THREE_D_MAP_CONFIG` and use it for the initial point of view. Keep the existing arc, polygon, and hover logic.

- [ ] **Step 2: Keep `MapViewport` as the mode switch only**

Do not let `MapViewport` own any renderer initialization details. It should only route props to `TwoDMap` or `Globe3DMap` and render shared overlays.

- [ ] **Step 3: Narrow the debug panel to visible, user-facing knobs**

Keep the current controls that people can visually tune:

```ts
latestSectionHeight
twoD.centerLng
twoD.centerLat
twoD.zoom
twoD.minZoom
twoD.maxZoom
twoD.contentPaddingX
threeD.povLng
threeD.povLat
threeD.povAltitude
```

Keep the reset and persistence controls, but make sure the panel edits feed the normalized config paths rather than mixing renderer internals into one bucket.

- [ ] **Step 4: Reconcile the hook with the new config modules**

Update `useMapDebugSettings.ts` to normalize 2D and 3D settings with the new config helpers, keep localStorage persistence working, and continue exposing the same public hook API used by `App.tsx`.

- [ ] **Step 5: Run the client build again**

Run: `npm run build --workspace client`

Expected: the viewport, debug panel, and both renderers still compile together.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Globe3DMap.tsx client/src/components/MapViewport.tsx client/src/components/MapDebugPanel.tsx client/src/hooks/useMapDebugSettings.ts client/src/App.tsx
git commit -m "refactor: split 2d and 3d rendering config"
```

### Task 4: Final verification and cleanup

**Files:**
- Modify: any client files touched by the refactor

- [ ] **Step 1: Run the full repository build**

Run: `npm run build`

Expected: both client and server builds pass.

- [ ] **Step 2: Run the server test suite**

Run: `npm run test`

Expected: server tests still pass, confirming the refactor did not disturb mocked data contracts.

- [ ] **Step 3: Verify the map interactively**

Check in the browser:

- 2D zoom accepts fractional values
- 2D pan can move beyond the visible world
- no repeated world copies appear in 2D
- 3D still loads with the globe camera defaults
- debug changes apply only to the intended mode

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "refactor: complete map rendering split"
```

