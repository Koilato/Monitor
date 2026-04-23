import { pathToFileURL } from 'node:url';
import type { Server } from 'node:http';
import { createApp } from './app.js';

const DEFAULT_PORT = 8787;

type StartableApp = {
  listen: (port: number, callback: (error?: NodeJS.ErrnoException) => void) => Server;
};

type StartServerOptions = {
  createAppInstance?: () => StartableApp;
  port?: number;
  logger?: Pick<typeof console, 'log' | 'error'>;
  exit?: (code: number) => void;
};

export function startServer(options: StartServerOptions = {}): Server {
  const {
    createAppInstance = createApp,
    port = Number(process.env.PORT || DEFAULT_PORT),
    logger = console,
    exit = (code) => process.exit(code),
  } = options;
  const app = createAppInstance();

  return app.listen(port, (error?: NodeJS.ErrnoException) => {
    if (error) {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Failed to start server: port ${port} is already in use.`);
      } else {
        logger.error(`Failed to start server on port ${port}.`);
        logger.error(error);
      }
      exit(1);
      return;
    }

    logger.log(`World map server listening on http://localhost:${port}`);
  });
}

function isEntryPoint(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath) && import.meta.url === pathToFileURL(scriptPath).href;
}

if (isEntryPoint()) {
  startServer();
}
