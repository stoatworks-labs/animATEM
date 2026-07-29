# animATEM

Electron ATEM-switcher control app with UVC multiview compositing. TypeScript, electron-vite (node + web tsconfigs), vitest. Phase 1 built.

## Commands (npm)
- Dev: `npm run dev` (electron-vite dev)
- Typecheck: `npm run typecheck` (node + web)
- Lint / format: `npm run lint` · `npm run format`
- Test: `npm test` (vitest run) · `npm run test:watch`
- Build: `npm run build` (typecheck + electron-vite build)
- Package: `npm run build:mac` · `:win` · `:linux` (electron-builder)

## Layout
- Split main/preload (`tsconfig.node.json`) vs renderer (`tsconfig.web.json`) — typecheck covers both.
- `companion-module/` — Bitfocus Companion module for this app.

## Notes
- `postinstall` runs `electron-builder install-app-deps` (native deps).
- Private repo. Ships user-facing AI disclaimer. Multi-platform release CI; cross-compile macOS x86_64 on macos-14 (never macos-13). "Commit" = commit **and** push.
