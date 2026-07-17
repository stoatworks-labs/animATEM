# companion-module-animatem

A [Bitfocus Companion](https://bitfocus.io/companion) module for
[animATEM](../README.md) — lets Companion buttons trigger Cut/Auto/FTB,
source selection, memory recall, and animated SuperSource memory recall
against an ATEM switcher via animATEM's local control server, and shows
feedback/variables for the current program/preview input and connection
status.

Built against `@companion-module/base` v2 (Companion 3.0+), matching the
structure of the official
[companion-module-template-ts](https://github.com/bitfocus/companion-module-template-ts).

## How it talks to animATEM

animATEM runs a small WebSocket server on `127.0.0.1:51234` (main process,
`src/main/services/controlServer.ts` in the parent repo) whenever the app is
running — no extra setup needed on the animATEM side. This module connects
to it, reconnecting automatically if animATEM restarts.

Recalling a memory from a Companion button pushes it straight to the
switcher, unlike animATEM's own touchscreen UI where recall loads into an
editable preview first — a physical button press doesn't have a screen to
review a pending change on, so it behaves like recalling a bank on real
switcher hardware instead.

## Build

```sh
npm install
npm run build
```

`npm run typecheck` and `npm run lint` before committing.

## Using it in Companion (development)

Companion loads modules from a "Developer Modules Path" you set in the
Companion launcher (gear icon, top right) — point it at `~/Projects/animATEM`
(the parent of this folder; Companion scans subfolders for a
`companion/manifest.json`, so having non-module folders like `src/` or
`docs/` alongside it is harmless). Companion auto-restarts the connection
whenever you save a file here after `npm run build` (or run `npm run dev`
for a build watcher).

Add an "animATEM" connection, set the host/port to match animATEM's control
server (defaults: `127.0.0.1` / `51234`), and it should come up green once
animATEM is running.

## Status

Actions: Cut, Auto, Fade to Black, Set Program Input, Set Preview Input,
Set Aux Source, Recall Memory, Animate to SuperSource Memory (both dropdowns
populated live from animATEM's saved memories; Animate also takes a
duration and eases into the layout instead of cutting to it — SuperSource
memories only, since DVE animation goes through the switcher's own
hardware fly-keyframes rather than this control server). Feedbacks: ATEM
connection up, Program input is X, Preview input is X. Variables:
connection status, program/preview input names.

Not yet submitted to Companion's module registry — for local/dev use only
for now.
