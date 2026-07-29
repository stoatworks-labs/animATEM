# animATEM — Developing

Electron + TypeScript via electron-vite, vitest. Two packages in one repo: the app, and the
Companion module under `companion-module/`.

The [README](../README.md) has the install recipe and the `extract-zip` workaround; this is the
model, the rules and the traps.

---

## 1. Where this sits

| Repo | Purpose |
|---|---|
| **animATEM** (this) | *Control one* switcher; UVC multiview compositing for SuperSource/DVE |
| **atem-overseer** | *Monitor and control* a fleet from one dashboard |
| **atem-fleet-admin** | *Provision/configure* many switchers at once |

Scope discipline matters here — fleet concerns belong in the other two.

## 2. Status, stated plainly

Phase 1 is built and CI is green. **It has not been validated against real ATEM hardware.**

Two specific things are unverified and are labelled as such in the code:

- The **coordinate scale** in `superSourceCoords.ts` / `dveCoords.ts` (§4).
- The **UVC capture path**, exercised only against a generic webcam, never a real multiview.

The compositing preview is a **model of what the switcher will do.** Until it's checked against
real output, treat agreement as unproven — and keep any new user-facing text saying so rather
than quietly upgrading the claim.

---

## 3. Layout and commands

```
src/main/         Electron main process
  services/         atemConnection, calibrationStore, controlServer, memoryStore
src/preload/      preload bridge
src/renderer/     UI
  src/capture/      captureManager, uvcCapture, useCalibration, useCaptureState
  src/compositor/   boxGeometry, compositeCanvas, dragInteraction,
                    dveCoords, superSourceCoords
src/shared/       protocol, easing, superSourceAnimation — shared main/renderer
companion-module/ Bitfocus Companion module (its own npm package, own tests)
```

```bash
npm run dev          # electron-vite dev
npm run typecheck    # node + web — use this, not a bare tsc
npm run lint         # / npm run format
npm test             # vitest run  (/ npm run test:watch)
npm run build        # typecheck + electron-vite build
npm run build:mac    # / :win / :linux
```

**Two tsconfigs**: main/preload (`tsconfig.node.json`) vs renderer (`tsconfig.web.json`).
`npm run typecheck` covers both — a bare `tsc` checks one and proves nothing about the other.

`postinstall` runs `electron-builder install-app-deps` for native dependencies. **If a native
module misbehaves after a dependency change, re-run install rather than hand-patching.**

`companion-module/` has its **own** `npm run test`. CI runs typecheck/lint/test for both packages
on every push and PR; `release.yml` builds Windows/macOS/Linux (x64 + arm64) installers on a
`v*` tag. **Cross-compile macOS x86_64 on `macos-14` — never `macos-13`.**

---

## 4. The coordinate systems are the hard part

`compositor/` is where the real complexity lives, and it is almost entirely **coordinate
conversion**. `dveCoords` and `superSourceCoords` exist because ATEM's DVE and SuperSource each
express box position and size in their own conventions, which match neither each other nor screen
pixels.

```ts
const COORD_RANGE = 4000       // in BOTH modules, independently
```

> **That constant is a labelled guess.** The values are confirmed raw Int16/UInt16 wire values
> (from `atem-connection`'s `SuperSourceBoxParametersCommand` serializer), but their **real-world
> scale is not documented anywhere reachable without a real switcher.**
>
> It affects **the preview visualisation only**. Take pushes the operator's exact raw values,
> untouched — so a wrong `COORD_RANGE` mis-draws the preview and cannot corrupt the command.
> This is the first thing to calibrate when hardware is available.

Each module provides the conversion *and its inverse* (`screenPositionToBoxXY`,
`screenSizeToBoxSize`, `screenPositionToDveXY`, `screenSizeToDveSize`), because a drag gesture has
to convert back. Keeping `COORD_RANGE` as one constant per module is what keeps the two directions
consistent — don't inline the number.

Watch the details that differ between the two:

- **Y is inverted** in both (`0.5 - y/8000`), because the switcher's Y grows upward and screen Y
  grows down.
- **SuperSource has one `size`; DVE has independent `sizeX`/`sizeY`.**
- **SuperSource crop is `cropped`/`crop*`; DVE mask is `maskEnabled`/`mask*`.** Same idea,
  different field names, and both are ignored unless their enable flag is set.

> **Extend the specs when you touch the maths.** There is good `.spec.ts` coverage alongside each
> module precisely because these conversions are easy to get subtly wrong in ways that look
> plausible. **A box that is 5% off looks fine in isolation and wrong next to a real switcher's
> output** — the tests are the only thing that catches that before hardware does.

`calibrationStore` exists because the UVC capture path needs aligning to the actual video.
Profiles are keyed **by resolution**. Don't assume the composite is pixel-true without one.

---

## 5. SuperSource animation is ours; DVE animation is the switcher's

The ATEM protocol has **no native SuperSource tweening**. An upstream keyer's DVE *is* animated by
the switcher in hardware via fly-keyframes.

So SuperSource easing is **client-side**: a fixed-cadence stream of interpolated positions, not a
single command. `src/shared/easing.ts` and `src/shared/superSourceAnimation.ts` live in `shared/`
specifically so the renderer's preview and the main process's push animate **identically** —
if they diverge, the preview stops predicting the output.

That asymmetry is why the control protocol has `animateSuperSource` and no DVE equivalent. Don't
add one; add a fly-keyframe command instead if DVE animation ever needs driving.

---

## 6. The control server

`src/main/services/controlServer.ts`, `ws://127.0.0.1:51234`. Full protocol in
[API.md §1](API.md#1-control-server--websocket-12700151234).

Design rules to preserve:

- **It is deliberately separate from the renderer's IPC bridge.** This one is network-facing;
  that one is not. Don't merge them for convenience.
- **A bad or unsupported command must not crash the server or drop the connection.**
  `handleMessage` catches and logs. Keep that — a control surface sending garbage during a show
  should be ignored, not fatal.
- **`recallMemory` from the control server pushes straight to the switcher**, unlike the editor
  UI which recalls into an editable Preview. A physical button press is a physical action. That
  difference is intentional and documented in
  [USER-GUIDE.md §7](USER-GUIDE.md) — don't "fix" it.

### ⚠ Binding and authentication

It binds `127.0.0.1` and has **no authentication**. Anything reaching that port locally can put
something on air. That's acceptable only while it stays on localhost.

> **If you ever change the binding to `0.0.0.0` or a network address, add authentication first.**
> As shipped it is not safe to expose beyond localhost, and the README says so — keep that note
> accurate.

### The protocol is duplicated by hand

`companion-module/src/protocol.ts` mirrors `src/shared/protocol.ts`. The module is a separate npm
package and cannot import from the app. **Change one, change the other, in the same commit.**

They are intentionally *not* byte-identical: the module's `Memory` types omit `layout`, since a
control surface doesn't need it. Message shapes must match; type breadth needn't.

---

## 7. Other conventions

- Field names in `src/shared/protocol.ts` **deliberately mirror `atem-connection`'s own state
  shape** so IPC payloads need no translation layer. Don't rename them for tidiness.
- `memoryStore` rewrites the whole JSON file on every save/delete, with no locking, and returns an
  empty list on a read failure. If memories ever need to survive concurrent writers, that's the
  place to change.
- Private repo, but it still ships a **user-facing AI-assisted disclaimer**. Keep it.
- "Commit" means commit **and** push.

---

## See also

- [API.md](API.md) — protocol, state model, coordinate maths, memories format
- [USER-GUIDE.md](USER-GUIDE.md) — the operator view
- [`companion-module/README.md`](../companion-module/README.md)
- [`AGENTS.md`](../AGENTS.md) — LLM onboarding
