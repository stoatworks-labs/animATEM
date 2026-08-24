# Notes

Working notes for this repo: status, decisions, and the traps that have actually bitten.
Migrated out of Claude Code's memory on 2026-08-24, so they are written in the first
person and dated by when each thing was learned — that date is usually the useful part.

Cross-cutting notes that are not specific to this repo live in
[fleet-notes](https://github.com/stoatworks-labs/fleet-notes).

*animATEM — Electron app to control Blackmagic ATEM switchers with a software-composited SuperSource/DVE preview built from the switcher's UVC multiview output, ~/Projects/animATEM, GitHub private repo*

animATEM (repo/local dir same name) lives at `~/Projects/animATEM`, GitHub
`allansargeant/animATEM` (private, unlike this user's other AV projects which
are public — pushed there 2026-07-15 per explicit instruction). Electron +
`electron-vite` + React + TypeScript, following the same
`src/{main,preload,renderer,shared}` / `main/services/*.ts` conventions as
this user's `presentation-commander-client/server` and `MicWizard` repos.

**Core idea**: controls an ATEM Mini Pro/Extreme ISO over Ethernet
(`atem-connection` npm library, main process) for standard PGM/PVW
switching, plus a from-scratch software-composited preview/program workflow
for SuperSource and DVE box layouts — captures the switcher's own multiview
output over USB (it enumerates as a UVC webcam once set to Multiview mode,
not the default Program), crops individual source boxes out of that live
feed in software, and recomposites them into an editable arrangement so an
operator can preview a SuperSource/DVE change with real live pixels before
pushing it ("Take") — nothing touches the real switcher until Take. Named
"memories" (app-level JSON presets, independent of ATEM's own macro system,
since macros can't be non-destructively previewed) capture/recall these
arrangements. SuperSource/DVE box position and size are editable by
dragging the box/corner handles directly on the Preview canvas (mouse or
touch), not just number inputs — **the user asked this interaction to feel
like professional broadcast switcher control software generally, but
explicitly asked not to name that inspiration in any docs/commits/code, so
don't mention it anywhere written to the repo.**

Phase 1 build (all done as of 2026-07-15, commits through `873ea99`):
ATEM connection service (real `atem-connection` client, not a stub — field
names in `shared/protocol.ts` were checked against the library's actual
`.d.ts` files rather than guessed, e.g. DVE uses `positionX/sizeX/mask*`
while SuperSource uses `x/size/crop*`), UVC multiview capture via a shared
`captureManager` singleton (one `<video>`/one rAF loop, every view
subscribes rather than each opening its own `getUserMedia`), a calibration
screen (operator draws each multiview box's pixel rect once per capture
resolution; the box→source mapping itself is read live from
`state.settings.multiViewers[].windows[].source`, not calibrated by hand —
confirmed via the real API that this is queryable), the `SourceCompositor`
crop primitive, SuperSource + DVE Program/Preview/Take editors with
drag-to-move/resize, the memory system, and a touchscreen `TouchScreen`
view (tap-to-select multiview regions + function key row: Cut/Auto/FTB/
PVW-PGM mode toggle/kiosk toggle via `BrowserWindow.setKiosk`).

**Known open/unverified item, load-bearing**: the numeric scale used to
convert ATEM's raw SuperSourceBox/DVE x/y/size/crop wire values into
on-screen preview positions (`superSourceCoords.ts`/`dveCoords.ts`,
`COORD_RANGE = 4000`) is an explicitly-labeled placeholder guess — real
scale is unverified since there's no ATEM hardware available yet. This
only affects the Preview pane's visual accuracy, not correctness of what
gets pushed on Take (that always sends the operator's exact raw values).
Revisit once real hardware is available. Similarly the whole UVC capture
path has only been tested against a generic webcam, never a real ATEM
multiview feed.

**UPDATE 2026-07-17 — real ATEM hardware now on the bench** (shared across all
this user's ATEM projects): an **ATEM Mini Extreme ISO at 192.168.1.14** (BMD
OUI 7c:2e:0d, mDNS `ATEM-AVE-7c2e0d16505d.local`, protocol/apiVersion 2.30,
record volume "Allan"), USB webcam out enumerating on this Mac as **"Blackmagic
Design" UVC Camera VendorID_7899 ProductID_48771** — the device
`uvcCapture.ts`/`listVideoInputs()` targets. So both load-bearing unverified
items above (COORD_RANGE=4000 scale + live UVC capture) are NOW testable.
Progress this session: OS enumerates the BMD UVC device, and animATEM's exact
getUserMedia path was reproduced in real Chrome. BLOCKER: confirming live frames
+ COORD_RANGE needs (a) a one-time **camera-permission grant** — a native
Chrome/OS prompt not reachable reliably via automation (see
**screenshot capture** (working-practice note, kept in Claude memory)) — and (b) the ATEM's **USB out set to
Multiview** on the switcher panel (app can't set this). Both are manual one-time
user steps; after that the Electron app or the capture-path harness can confirm
the multiview crop and calibrate the real scale.

**Verification approach used throughout** (see also
**screenshot capture** (working-practice note, kept in Claude memory)): no ATEM hardware exists yet, so
correctness was checked via typecheck/lint, an isolated `stub window.api`
Vite harness in the Browser pane for renderer-only checks, occasional real
`electron-vite dev` boots for main-process/IPC checks (log-only after two
screenshot mishaps — see below), and direct synthetic `PointerEvent`
dispatch via `javascript_tool` to verify the drag-to-move/resize
interaction end-to-end (confirmed correct sign/direction and anchored-
corner resize math).

**Incident**: mid-session, OS-level `screencapture -R` (even following the
previously-documented "verified frontmost" safe pattern) twice captured
the wrong screen content instead of the animATEM window — once briefly
grabbing this chat session's own transcript. Caught immediately both
times, discarded without acting on the content, disclosed to the user in
the moment. Switched entirely to headless-Chrome-writes-to-disk for all
further screenshots this session (see **screenshot capture** (working-practice note, kept in Claude memory) for
the full writeup and the updated recommended pattern) — this is now the
default for any future work on this or similar Electron projects, not
just a one-off fix.

**Companion module added same day** (commit `bf5f064`): a Bitfocus
Companion module lives at `companion-module/` (its own npm package within
the animATEM repo, not a separate repo — user explicitly asked for it "as
part of this project"). It talks to a new local control server
(`src/main/services/controlServer.ts`, WebSocket on `127.0.0.1:51234`,
started in the main process alongside the app) exposing cut/auto/ftb/
setProgram/setPreview/setAux/recallMemory over the network — a control
surface distinct from the renderer's IPC bridge. Built against the real
`bitfocus/companion-module-template-ts` (cloned fresh to build against,
not guessed — caught a hallucinated `runEntrypoint()` legacy-API call
this way before it shipped) and `@companion-module/base` v2.0.4/2.1.2
(the "current version" a web search initially reported, 1.14.1, was
stale/wrong — another confirmation to verify against the real repo, not
search summaries). Companion memory-recall pushes straight to the
switcher (unlike the app's own UI, which recalls into an editable preview
first) since a physical button press has no screen to review a pending
change on. Verified end-to-end against a real running animATEM instance:
both a raw WebSocket test client and the module's own compiled
`wsClient.js` connect, receive the initial status/snapshot/memories
burst, and round-trip commands without errors.

**Repo went public 2026-07-16/17** (user's own action, not mine — repo
visibility changes are on the prohibited-actions list, declined and
pointed the user to Settings/gh CLI when asked to do it directly).
Before that, added a security-note section to the README's bottom
flagging that the control server binds `127.0.0.1` with **no auth** —
fine for localhost-only as shipped, called out explicitly since it's now
public. Also outside this memory's visible session context (summarized
away, discovered mid-session via `git log`), earlier work in the same
overall session added `.github/workflows/release.yml` (multi-platform
installer builds, win/mac/linux × x64/arm64, macos-14 not macos-13 per
**ci intel mac runners** (working-practice note, kept in Claude memory)) and moved the AI disclaimer to the
very top of the README with a Roadmap/TODO section — check current
README state rather than assuming this memory has the full picture of
docs structure.

**Test suite + CI added 2026-07-17** (user asked to "keep going...
unattended" — this was autonomous follow-on work after the Companion
module): Vitest in both `animATEM` (67 tests) and `companion-module` (8
tests, own `vitest.config.ts`) — pure geometry/drag/coordinate-conversion
math, the file-backed calibration/memory stores (real I/O against a temp
dir, `electron`'s `app` mocked via `vi.mock` + `vi.hoisted`), the
Companion module's `wsClient` (mocked `ws`, fake timers for reconnect),
`atemConnection`'s `buildSnapshot` (refactored to take `AtemState`
directly instead of the whole `Atem` instance, specifically to make this
testable — caught a wrong enum guess here too, it's
`Enums.Model.MiniExtremeISO` not `ATEMMiniExtremeISO`), and
`controlServer`'s command routing/broadcast (mocked `ws`+`atemConnection`
+`memoryStore`). Added `.github/workflows/ci.yml` (typecheck/lint/test on
every push/PR, separate from `release.yml`) and actually watched it run
via `gh run watch` rather than trusting the YAML by eye.

**Real bug CI caught that local testing never did**: `companion-module`'s
lint failed in CI (`Cannot find package 'typescript-eslint'`) but passed
locally every time — `@companion-module/tools`' eslint config imports
`typescript-eslint` directly, which got dropped from `package.json` when
the official template's devDependencies were trimmed earlier (only
husky/lint-staged were meant to go). Local Node module resolution walked
up from `companion-module/node_modules` to the parent `animATEM/node_modules`
and found it there as a transitive dep of the root project's own eslint
tooling — invisible locally (nested directory, same working tree) but CI
installs each job in complete isolation. Fixed by adding it explicitly;
confirmed for real by temporarily moving the parent's `node_modules`
aside and re-running lint/typecheck/test/build from `companion-module/`
alone before pushing again. **Lesson: a monorepo-like nested-package
layout can mask missing dependencies locally via parent hoisting — don't
trust "it passes locally" for a nested package without an isolated check
(hide the parent node_modules, or just trust CI on a clean runner).**

Also verified `npm run build:mac` for real: produces working unsigned
x64+arm64 `.dmg`/`.zip`, and the packaged arm64 `.app` boots cleanly
standalone (full process tree, control server binds) — this had
previously only ever been exercised through `npm run dev`, never a real
production package, until this pass.

**Calibration fixed for real hardware, 2026-07-17/18**: first live test against
the Mini Extreme ISO produced "completely wrong/random" crops. Root cause:
the app had assumed ATEM multiview `windowIndex` values are numbered
left-to-right/top-to-bottom — they are not (confirmed live: a manually-typed
window index's "Live source" didn't match what was visually in that box).
Fixed `CalibrationScreen.tsx` so the operator never types/guesses a numeric
window index — a new box gets a best-effort default (first unclaimed live
window) and is always confirmed/corrected via a dropdown of the ATEM's
actual current live sources **by name**, matched to what's visually in the
box. User confirmed this works. Follow-on same session: user asked the app
to "read how many boxes are actually active and preset that many options" —
added an "Auto-create N boxes" button that seeds a `ceil(sqrt(N))`-column
starting grid for however many live multiview windows are currently
reported (`liveWindows(snapshot).length`), each pre-assigned sequentially,
plus full drag-to-move/resize on calibration boxes (reused
`dragInteraction.ts`'s `hitTestBoxes`/`applyDrag` exactly as
`SuperSourceEditor.tsx` does, `keepSquare: false`) so boxes are nudged into
place rather than drawn freehand one at a time. Commit `1b11c3d`, pushed;
typecheck/lint/test (67 tests) all pass; `npm run build:unpack` rebuilt
successfully for the user to test live. The starting grid positions are a
generic heuristic, not real per-model layout geometry (still undocumented/
unqueryable) — drag-to-adjust is how the operator gets exact placement.

**Screenshots regenerated + SuperSource animation added, 2026-07-18**
(commits `625a7da`, `a87fa29`): README/companion-module README screenshots
were stale (pre-dated the auto-create-boxes calibration fix). Rebuilt via a
throwaway dev-only harness — `vite.shot.config.mjs` (plain `vite` pointed at
`src/renderer`, a `transformIndexHtml` plugin injecting a stub script before
`main.tsx`) + `shot-stub.ts` (fixture `window.api`, and a synthetic "UVC"
feed: a hidden `<canvas>` redrawn with colour-bar/number test-pattern boxes,
fed in via `navigator.mediaDevices.getUserMedia` override). Both files were
deleted after use, never committed. Two non-obvious pitfalls hit + fixed
here, now in **screenshot capture** (working-practice note, kept in Claude memory): `canvas.captureStream(30)`
left the video stuck at a 2x2 placeholder size (switch to
`captureStream(0)` + manual `track.requestFrame()` per draw), and
`CaptureDevicePicker`'s permission-priming `getUserMedia({video:true})` +
immediate `track.stop()` killed the one real capture track since the stub
returned the same singleton every call (fix: return
`new MediaStream([sourceTrack.clone()])` per call). Final capture used
`npx playwright screenshot -b chromium --channel chrome --wait-for-selector
... --wait-for-timeout ...` (reuses system Chrome, no Playwright browser
download, and far more reliable than raw `--headless --screenshot` timing
flags for a React app with async IPC-backed data loading).

Same session, explored + built **animated SuperSource box moves**
(user asked to "research techniques for animating supersource boxes",
approved building it). Ground truth checked directly in
`atem-connection`'s `.d.ts` files first: `SuperSourceBoxParametersCommand`
has no rate/keyframe field at all (always instant), whereas
`UpstreamKeyerDVESettings` already has real hardware animation
(`flyKeyframes` A/B, `rate`, `runToInfiniteIndex` — the switcher
interpolates DVE moves itself). Web research (community prior art: a
VISE/SwitcherLib blog post, a PowerShell gist, `companion-module-bmd-atem`
issue #144, `ATEM-Animation-Generator`) confirmed the established technique
for SuperSource specifically is client-side: stream eased intermediate
box states at ~10-20ms cadence, since the protocol won't tween it for you.
Built as `atemConnection.animateSuperSourceLayout()` — a `setTimeout` loop
in the **main** process (deliberately not renderer `rAF`, which throttles
when unfocused/backgrounded and would stall an in-flight animated Take),
20ms step, `easeInOutQuad`, pure math split into two new tested shared
modules (`src/shared/easing.ts`, `src/shared/superSourceAnimation.ts`).
Boxes turning off stay enabled through the animation (geometry eases away)
and only actually disable in the final exact command. Wired end-to-end: an
"Animate over Ns" control next to Take in `SuperSourceEditor.tsx`, a new
`animateSuperSource` control-server message, and a matching Companion
action (SuperSource memories only — DVE animation would be a separate,
hardware fly-keyframe-driven path, not built yet). 86+8 tests passing,
typecheck/lint clean in both packages, functionally verified via the same
throwaway-harness technique (confirmed the IPC call fires with correct
args and resolves).

**How to apply**: before recommending anything about ATEM protocol field
names/scales, check `node_modules/atem-connection/dist/**/*.d.ts` directly
rather than relying on this memory or general knowledge — that's exactly
how the DVE-vs-SuperSource field-name mismatch was originally caught. Same
applies to the Companion module SDK — check a freshly-cloned
`companion-module-template-ts`/`companion-module-base` rather than
training knowledge, which skews toward older/legacy Companion module
patterns. Re-read the README's "Status" section for current build state
since it may have evolved past this snapshot.
