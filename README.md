# World Map App

Minimal standalone attack-flow map project.

## Structure

- `client/`: Vite + React + TypeScript UI
- `server/`: Express + TypeScript mock API
- `shared/`: shared response/query types

## Run

Install dependencies from the repository root:

```bash
npm install
```

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

Run server tests:

```bash
npm run test
```

The UI expects the API at `http://localhost:8787` by default.
