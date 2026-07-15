# animATEM

Network control for Blackmagic ATEM switchers (Mini Pro/Extreme ISO family,
Phase 1), with standard PGM/PVW switching plus a software-composited
preview/program workflow for SuperSource and DVE box layouts.

Instead of building a synthetic preview from scratch, animATEM captures the
switcher's own multiview output over USB (it enumerates as a UVC webcam),
crops the individual source boxes out of that live multiview feed in
software, and recomposites them into an arbitrary custom arrangement to
preview SuperSource/DVE changes with real live pixels before they're pushed
to air. Named "memories" — app-level presets, independent of the ATEM's own
macro system — capture and recall these arrangements.

> This project's code is being written with AI assistance (Claude Code),
> reviewed by a human. It has not yet been validated against real ATEM
> hardware.

## Stack

Electron + `electron-vite` + React + TypeScript, following the same
conventions as this author's other Electron control apps
(`presentation-commander-client/server`, `MicWizard`):
`src/{main,preload,renderer,shared}`, service classes under
`src/main/services/*.ts`.

ATEM Ethernet protocol control via
[`atem-connection`](https://github.com/Sofie-Automation/sofie-atem-connection)
(main process — UDP). UVC multiview capture via the renderer's
`navigator.mediaDevices.getUserMedia` (full Chromium context, no native
addon needed).

## Development

```sh
npm install
npm run dev
```

`npm run typecheck` and `npm run lint` before committing.

## Status

Phase 1 scaffold in progress — see the project plan for current scope.
Requires an ATEM Mini Pro/Extreme ISO with its USB output set to
**Multiview** (not the default Program) for the compositing workflow to
work.
