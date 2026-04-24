import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginResizeDrag,
  applyWorkspaceLayoutCssVars,
  resolveWorkspaceLayout,
} from '../../src/shell/hooks/useWorkspaceLayout';

test('resolveWorkspaceLayout clamps widths and heights to the workspace bounds', () => {
  const result = resolveWorkspaceLayout(
    { width: 1200, height: 800 },
    950,
    90,
    700,
  );

  assert.equal(result.hasWorkspaceBounds, true);
  assert.equal(result.maxRightColumnWidth, 892);
  assert.equal(result.maxBottomPanelHeight, 612);
  assert.equal(result.clampedRightColumnWidth, 892);
  assert.equal(result.clampedLeftBottomHeight, 120);
  assert.equal(result.clampedLatestSectionHeight, 612);
});

test('beginResizeDrag restores body styles and removes listeners when the drag finishes', () => {
  const listeners = {
    mousemove: new Set<(event: { clientX: number; clientY: number; preventDefault(): void }) => void>(),
    mouseup: new Set<() => void>(),
  };
  const document = {
    body: {
      style: {
        cursor: 'default',
        userSelect: 'text',
      },
    },
  };
  const window = {
    addEventListener(type: 'mousemove' | 'mouseup', listener: (event?: any) => void) {
      listeners[type].add(listener as never);
    },
    removeEventListener(type: 'mousemove' | 'mouseup', listener: (event?: any) => void) {
      listeners[type].delete(listener as never);
    },
  };
  const sizes: number[] = [];

  const cleanup = beginResizeDrag(
    { window: window as never, document: document as never },
    {
      axis: 'x',
      anchor: 'end',
      startSize: 220,
      minSize: 160,
      maxSize: 280,
      startClientPosition: 100,
      onResize: (size) => {
        sizes.push(size);
      },
    },
  );

  assert.equal(document.body.style.cursor, 'col-resize');
  assert.equal(document.body.style.userSelect, 'none');
  assert.equal(listeners.mousemove.size, 1);
  assert.equal(listeners.mouseup.size, 1);

  const [moveListener] = [...listeners.mousemove];
  moveListener({
    clientX: 140,
    clientY: 0,
    preventDefault() {},
  });

  assert.deepEqual(sizes, [180]);

  cleanup();

  assert.equal(document.body.style.cursor, 'default');
  assert.equal(document.body.style.userSelect, 'text');
  assert.equal(listeners.mousemove.size, 0);
  assert.equal(listeners.mouseup.size, 0);
});

test('applyWorkspaceLayoutCssVars writes layout variables to the shell root and latest section', () => {
  const appShellWrites: Array<[string, string]> = [];
  const latestSectionWrites: Array<[string, string]> = [];

  applyWorkspaceLayoutCssVars(
    {
      appShell: {
        style: {
          setProperty(name: string, value: string) {
            appShellWrites.push([name, value]);
          },
        },
      },
      latestSection: {
        style: {
          setProperty(name: string, value: string) {
            latestSectionWrites.push([name, value]);
          },
        },
      },
    },
    {
      hasWorkspaceBounds: true,
      maxRightColumnWidth: 892,
      maxBottomPanelHeight: 612,
      clampedRightColumnWidth: 720,
      clampedLeftBottomHeight: 180,
      clampedLatestSectionHeight: 160,
    },
  );

  assert.deepEqual(appShellWrites, [
    ['--workspace-right-column-width', '720px'],
    ['--workspace-left-bottom-height', '180px'],
  ]);
  assert.deepEqual(latestSectionWrites, [
    ['--latest-feed-height', '160px'],
  ]);
});
