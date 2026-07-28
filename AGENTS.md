# AGENTS.md — bringing an LLM up to speed on animATEM

Orientation for an AI assistant (or a new human) picking this project up cold. `CLAUDE.md`
holds the short command reference; this file explains the model and the traps.

---

## 1. What this is

Network control for **Blackmagic ATEM switchers** (Mini Pro / Extreme ISO family, Phase 1):
standard PGM/PVW switching, plus a **software-composited preview/program workflow for
SuperSource and DVE box layouts**.

The compositing part is the distinctive bit. Rather than only sending commands and hoping,
it composites a preview of SuperSource/DVE box arrangements locally (over UVC multiview
capture), so a layout can be seen before it goes to air.

Electron + TypeScript, electron-vite, vitest. **Private repo.**

## 2. Where this sits among the ATEM projects

| Repo | Purpose |
|---|---|
| **animATEM** (this) | *Control one* switcher; UVC multiview compositing for SuperSource/DVE |
| **atem-overseer** | *Monitor and control* a fleet from one dashboard |
| **atem-fleet-admin** | *Provision/configure* many switchers at once |

## 3. Layout

```
src/main/       Electron main process
  services/       atemConnection, calibrationStore, controlServer, memoryStore
src/preload/    Preload bridge
src/renderer/   UI
  src/compositor/  boxGeometry, compositeCanvas, dragInteraction,
                   dveCoords, superSourceCoords
src/shared/     easing, superSourceAnimation - shared main/renderer code
companion-module/  Bitfocus Companion module for this app
```

**Two tsconfigs**: main/preload (`tsconfig.node.json`) vs renderer (`tsconfig.web.json`).
`npm run typecheck` covers both — use it rather than a bare `tsc`.

## 4. The coordinate systems are the hard part

The `compositor/` directory is where the real complexity lives, and it is almost entirely
about **coordinate conversion**: `dveCoords` and `superSourceCoords` exist because ATEM's DVE
and SuperSource each express box position and size in their own conventions, which match
neither each other nor screen pixels.

There is good test coverage here (`.spec.ts` alongside each module) precisely because these
conversions are easy to get subtly wrong in ways that look plausible on screen. **Extend the
specs when you touch the maths** — a box that is 5% off looks fine in isolation and wrong
next to a real switcher output.

`calibrationStore` exists because the UVC capture path needs aligning to the actual video;
don't assume the composite is pixel-true without it.

## 5. Commands

```bash
npm run dev          # electron-vite dev
npm run typecheck    # node + web
npm run lint         # / npm run format
npm test             # vitest run  (/ npm run test:watch)
npm run build        # typecheck + electron-vite build
npm run build:mac    # / :win / :linux (electron-builder)
```

`postinstall` runs `electron-builder install-app-deps` for native dependencies — if a native
module misbehaves after a dependency change, re-run install rather than hand-patching.

## 6. Status

Phase 1 is built, and CI is green. **It has not been validated against real ATEM hardware.**
The compositing preview in particular is a model of what the switcher will do — until it's
checked against a real switcher's output, treat agreement as unproven.

## 7. Conventions

- Private repo, but it still ships a user-facing AI-assisted disclaimer.
- Multi-platform release CI; cross-compile macOS x86_64 on `macos-14` — never `macos-13`.
- "Commit" means commit **and** push.
