import { createApp } from './app.js';

const DEFAULT_PORT = 8787;

const port = Number(process.env.PORT || DEFAULT_PORT);
const app = createApp();

app.listen(port, () => {
  console.log(`World map server listening on http://localhost:${port}`);
});
