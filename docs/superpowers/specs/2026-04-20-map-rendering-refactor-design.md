# Map Rendering Refactor Design

## Context

The current client mixes page layout, debug state, and map engine details across `App.tsx`, `MapViewport.tsx`, `TwoDMap.tsx`, `Globe3DMap.tsx`, and `useMapDebugSettings.ts`.

This makes the rendering layer hard to change safely:

- 2D and 3D map settings are stored together even when they are unrelated.
- The 2D map is built around wrapped world behavior and tuned with a few hardcoded assumptions.
- Visual configuration, debug controls, and renderer internals are not clearly separated.
- The UI still depends on mocked data and should continue to do so.

This design focuses only on the map rendering layer. It does not replace the mock data flow or introduce a backend.

## Goals

- Split 2D and 3D rendering boundaries so each mode is independently understandable.
- Make the 2D map render a single world copy only.
- Support continuous zoom in 2D, not stepped or repeated zoom behavior.
- Allow free panning in 2D, including leaving the visible world area.
- Separate 2D and 3D configuration files.
- Move common visible tuning values into the debug panel.
- Keep all current data sources mocked.

## Non-Goals

- Replacing the mock API with a backend.
- Redesigning the overall page layout in this phase.
- Changing the page split-drag range or divider behavior.
- Changing the latest-feed panel behavior.
- Reworking 3D into a new engine.
- Introducing a new map data source.

## Proposed Structure

The map rendering code should be organized around three layers:

1. `MapViewport` becomes a thin coordinator that chooses the active mode and hosts shared overlays.
2. Each mode owns its own renderer and mode-specific config.
3. Shared map utilities stay in focused helper modules, not in the page component.

Suggested file layout:

- `client/src/map/shared/`
- `client/src/map/2d/`
- `client/src/map/3d/`
- `client/src/map/config/`

The exact folder names can vary, but the split should remain the same:

- shared utilities for geometry, hover anchors, and palette logic
- 2D renderer and 2D config
- 3D renderer and 3D config
- a minimal shared contract for the viewport and debug panel

## Rendering Boundary

### `App.tsx`

`App.tsx` should only coordinate page-level state:

- active map mode
- debug panel open/closed
- date range and mock data requests
- page layout drag state

It should not contain map engine-specific logic.

### `MapViewport`

`MapViewport` should:

- choose between 2D and 3D renderers
- pass the correct mode config to the active renderer
- render shared chrome such as the threat legend and popup

It should not know how MapLibre or Globe.gl are initialized.

### 2D renderer

The 2D renderer owns:

- MapLibre map creation and disposal
- country fill, line, hover, and threat layers
- deck.gl arc overlays
- 2D hover hit-testing and cursor updates
- zoom and pan behavior

### 3D renderer

The 3D renderer owns:

- Globe.gl creation and disposal
- globe image / bump image / background setup
- polygon styling and hover highlighting
- boundary path styling
- 3D camera control

## 2D Rendering Design

### Single world copy

The 2D map must render one world copy only.

That means:

- no repeated wrapping across the horizontal axis
- no dependence on `renderWorldCopies` for visual continuity
- no duplicated geometry to fake infinite repetition

The world should behave like a single large canvas that can be panned beyond the edge. Empty background space is acceptable and expected.

### Continuous zoom

The 2D zoom model should allow fractional values across the full range.

This means:

- zoom values remain continuous
- the renderer accepts decimal zoom input
- the UI does not force discrete steps or tile-like snapping

The debug panel should expose the current 2D zoom value directly so it is obvious what the renderer is doing.

### Free panning

The 2D map should allow free pan motion:

- the user can drag the map anywhere
- the camera is not clamped to keep the world centered
- the renderer does not hard-stop at the world edge

This is the simplest way to support a non-repeating single-world presentation.

### Hover and layer behavior

Hover behavior should stay inside the 2D renderer:

- a single active hover layer for the current country
- threat fill and threat outline remain data-driven
- attack arcs stay as an overlay layer

The renderer should keep using the current mock data flow and should not require new server endpoints.

### 2D config responsibilities

2D-specific configuration should live in a dedicated config module.

It should define:

- default camera center
- default zoom
- zoom limits
- map frame padding or margin values
- any 2D-only visual constants that are not useful to users in the debug panel

Mode-specific defaults should be normalized once, then passed into the renderer as a stable object.

## 3D Rendering Design

The 3D globe should remain a separate renderer with its own config file.

The 3D config should define:

- default point of view longitude
- default point of view latitude
- default altitude
- any 3D-only styling constants

The 3D renderer should continue to own its own hover and arc sync behavior. It should not inherit 2D assumptions about zoom, wrapping, or panning.

## Configuration Split

The current settings object mixes layout, 2D, and 3D values into one debug store.

This design keeps one debug entry point in the UI, but normalizes values into separate mode configs internally.

### Public debug values

The debug panel should expose values that a person can visually understand and tune:

- layout height for the latest feed area
- 2D center longitude and latitude
- 2D zoom and zoom limits
- 2D frame padding or inset
- 3D point of view longitude, latitude, and altitude

### Internal values

The renderer may still need internal constants that are not user-facing:

- minimum and maximum clamp bounds
- hover layer defaults
- feature filtering rules
- renderer-specific thresholds

These should live in the renderer or its config module, not in the visible debug controls.

### Separation rule

The debug panel should not be the source of truth for engine internals.

Instead:

- debug panel edits produce patches for a mode config
- config modules validate and clamp those patches
- renderers consume normalized config only

This keeps the visible controls simple and avoids the current pattern where the debug store acts as both UI state and renderer implementation state.

## Mock Data Contract

The current mocked country hover, threat map, and latest feed data stay unchanged.

The refactor should not:

- change the request URLs
- change response shapes
- require a backend
- introduce new API dependencies for map rendering

If a renderer needs extra derived data, it should derive it locally from the existing mock responses or the local country geometry file.

## Error Handling

Each renderer should fail independently.

If 2D initialization fails:

- the rest of the page stays usable
- the failure is logged
- the viewport can still switch to 3D

If 3D initialization fails:

- 2D should still work
- the failure is logged
- the page should not crash

If country geometry fails to load:

- show a stable empty map state
- keep the rest of the interface alive

## Testing Strategy

### Unit tests

Add focused tests for:

- 2D and 3D config normalization
- clamp behavior for debug patches
- single-world 2D mode defaults
- hover anchor placement helpers

### Manual verification

Verify the following behaviors in the browser:

- 2D zoom changes smoothly with fractional values
- 2D panning can leave the world bounds
- no repeated world copies appear in 2D
- hover still works on countries after mode switching
- 3D still loads with its separate camera defaults
- debug panel updates the correct mode only

## Acceptance Criteria

This refactor is complete when:

- `MapViewport` no longer contains map engine internals.
- 2D and 3D config live in separate modules.
- 2D uses a single world copy and continuous zoom.
- 2D allows free pan movement.
- Visible map tuning values are available in the debug panel.
- Mock data flow still powers the map.
- The UI still switches between 2D and 3D without regressions.
