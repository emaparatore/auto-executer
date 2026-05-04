# AGENTS.md

## Scope and layout
- This repo's active project is `requirements-workflow-desktop/`; run Node/Electron commands there, not from repo root.
- Core runtime pieces: `electron/main.js` (Electron boot + embedded server startup), `server.js` (Express API + SQLite persistence), `app.js` (frontend logic), `index.html` + `styles.css` (UI shell/styles).

## Verified commands
- Install deps: `npm install` (runs `postinstall` hook `electron-builder install-app-deps`).
- Run desktop app in dev mode: `npm run dev` (alias of `npm start`, both run `electron .`).
- Run API/UI server without Electron: `npm run server` (Express on `127.0.0.1`, default port `3500`).
- Build Windows installer: `npm run dist` (electron-builder `--win`, output in `dist/`).

## Runtime and data gotchas
- `electron/main.js` enforces single-instance lock and auto-selects a free localhost port starting at `3500`; do not hardcode a fixed port assumption.
- Electron sets `WORKSPACES_DB_FILE` to app userData (`workspaces.db`); running `server.js` directly uses local `workspaces.db` unless env var is set.
- Workspace creation expects a project folder containing `docs/plans` and `docs/requirements`; API rejects missing directories.
- App/API messages and UI copy are partly Italian; preserve language/style consistency when editing UX strings.

## Packaging constraints
- Electron builder `files` list is explicit in `package.json`; when adding runtime files, update `build.files` or they will be missing from packaged app.
- Windows icon path is `build/icon.ico`; missing icon/build resources can break branded installer output.

## What is not here (avoid guessing)
- No lint/typecheck/test scripts are defined in `package.json`; do not claim those checks were run unless you add and execute them.
- No CI workflow or extra agent-instruction files were found in this repo snapshot.
