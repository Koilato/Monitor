# World Map App

Minimal standalone attack-flow map project.

## Structure

- `client/`: Vite + React + TypeScript UI
- `server/`: Express + TypeScript mock API
- `shared/`: shared response/query types

## Run

Install dependencies only from the repository root:

```bash
npm install
```

Do not run `npm install` inside `client/` or `server/`; the root `package-lock.json` is the only supported lockfile.

Start the mock API:

```bash
npm run dev:server
```

Start the UI in another shell:

```bash
npm run dev:client
```

Build both apps:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

The UI expects the API at `http://localhost:8787` by default.
