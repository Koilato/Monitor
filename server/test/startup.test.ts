import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { startServer } from '../src/index.js';

type ListenCallback = (error?: NodeJS.ErrnoException) => void;

type FakeApp = {
  listen: (port: number, callback: ListenCallback) => Server;
};

test('startServer reports EADDRINUSE instead of logging a false success', () => {
  let listenCallback: ListenCallback | undefined;
  let exitCode: number | undefined;
  const logs: string[] = [];
  const errors: string[] = [];

  const fakeApp: FakeApp = {
    listen: (_port, callback) => {
      listenCallback = callback;
      return {} as Server;
    },
  };

  startServer({
    createAppInstance: () => fakeApp,
    port: 8787,
    logger: {
      log: (message) => logs.push(message),
      error: (message) => errors.push(String(message)),
    },
    exit: (code) => {
      exitCode = code;
    },
  });

  assert.ok(listenCallback, 'listen callback should be captured');

  listenCallback?.({
    name: 'Error',
    message: 'listen EADDRINUSE: address already in use :::8787',
    code: 'EADDRINUSE',
  } as NodeJS.ErrnoException);

  assert.equal(logs.length, 0);
  assert.equal(exitCode, 1);
  assert.match(errors[0] ?? '', /already in use/i);
});
