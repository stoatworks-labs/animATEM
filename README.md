# animATEM

[![ci](https://github.com/stoatworks-labs/animATEM/actions/workflows/ci.yml/badge.svg)](https://github.com/stoatworks-labs/animATEM/actions/workflows/ci.yml)

> **AI-assisted project.** This codebase was created with [Claude Code](https://claude.com/claude-code)
> (Anthropic), directed and reviewed by a human author. It's been run against a real ATEM
> Mini Extreme ISO (2026-07-17/18), where the multiview calibration turned out to be wrong and
> got fixed. The coordinate scale for the Preview panes is still an uncalibrated placeholder.
> See [Status](#status).

Network control for Blackmagic ATEM switchers (the Mini Pro/Extreme ISO family, for Phase 1),
with ordinary PGM/PVW switching plus a preview/program workflow for SuperSource and DVE box
layouts, composited in software.

Rather than building a pretend preview from scratch, animATEM captures the switcher's own
multiview output over USB (it turns up as a UVC webcam), crops the individual source boxes
out of that live feed in software, and recomposites them into whatever arrangement you like,
so you can preview SuperSource and DVE changes with live pixels before they go to air. Named
"memories" (presets that belong to the app, independent of the ATEM's own macro system)
capture and recall these arrangements.

SuperSource box moves can also be **animated** rather than cut. The ATEM protocol has no
SuperSource tweening of its own (unlike an upstream keyer's DVE, which the switcher animates
in hardware with fly keyframes), so animATEM eases into the target layout from the client
end, sending a fixed-cadence stream of interpolated positions rather than one instant
command. Pick a duration and hit "Animate" instead of "Take" in the SuperSource editor.

There's a [Bitfocus Companion](https://bitfocus.io/companion) module in its own repo,
[companion-module-animatem](https://github.com/stoatworks-labs/companion-module-animatem).
It does cut, auto and FTB per M/E, program, preview and aux selection **by input name**, and
SuperSource/DVE memory recall, with program and preview tally. It talks to animATEM's local
control server, so there's nothing to set up on this side beyond having the app running.

[![animATEM — ATEM SuperSource and DVE previews from the switcher's own multiview](docs/video-thumb.png)](https://www.youtube.com/watch?v=Uhs7UqI3Rlk)

*[Watch it](https://www.youtube.com/watch?v=Uhs7UqI3Rlk) (58 seconds): calibration, the Touch surface, SuperSource boxes dragged and animated, a memory saved and recalled, and a DVE move taken. No switcher was harmed, or indeed involved: it's the app's own renderer in the repo's filming harness (`src/film`), with a stand-in switcher and a synthetic test-pattern multiview, recorded headlessly.*

<!-- downloads:start -->

## Download

**[v0.2.2](https://github.com/stoatworks-labs/animATEM/releases/tag/v0.2.2)** — prebuilt for macOS, Windows and Linux. Pick your platform:

<details>
<summary><b>macOS</b> — Apple Silicon, Intel</summary>

| Build | Download | Size |
| --- | --- | --- |
| Apple Silicon · .dmg disk image | [`animATEM-0.2.2-arm64.dmg`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2-arm64.dmg) | 137 MB |
| Intel · .dmg disk image | [`animATEM-0.2.2.dmg`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2.dmg) | 144 MB |
| Apple Silicon · .pkg installer | [`animatem-0.2.2-macos-arm64.pkg`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-macos-arm64.pkg) | 137 MB |
| Intel · .pkg installer | [`animatem-0.2.2-macos-x64.pkg`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-macos-x64.pkg) | 144 MB |
| Apple Silicon · .zip archive | [`animATEM-0.2.2-arm64-mac.zip`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2-arm64-mac.zip) | 138 MB |
| Intel · .zip archive | [`animATEM-0.2.2-mac.zip`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2-mac.zip) | 144 MB |

</details>

<details>
<summary><b>Windows</b> — x64 & ARM64, x64, ARM64</summary>

| Build | Download | Size |
| --- | --- | --- |
| x64 & ARM64 · .exe installer | [`animatem-0.2.2-setup.exe`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-setup.exe) | 254 MB |
| x64 · .exe installer | [`animatem-0.2.2-x64-setup.exe`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-x64-setup.exe) | 130 MB |
| ARM64 · .exe installer | [`animatem-0.2.2-arm64-setup.exe`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-arm64-setup.exe) | 124 MB |
| x64 & ARM64 · portable .exe | [`animatem-0.2.2-portable.exe`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-portable.exe) | 253 MB |
| x64 · portable .exe | [`animatem-0.2.2-x64-portable.exe`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-x64-portable.exe) | 130 MB |
| ARM64 · portable .exe | [`animatem-0.2.2-arm64-portable.exe`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2-arm64-portable.exe) | 124 MB |
| x64 · .zip archive | [`animATEM-0.2.2-win.zip`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2-win.zip) | 166 MB |
| ARM64 · .zip archive | [`animATEM-0.2.2-arm64-win.zip`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2-arm64-win.zip) | 164 MB |

</details>

<details>
<summary><b>Linux</b> — x64, ARM64</summary>

| Build | Download | Size |
| --- | --- | --- |
| x64 · .deb package (Debian/Ubuntu) | [`animatem_0.2.2_amd64.deb`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem_0.2.2_amd64.deb) | 105 MB |
| ARM64 · .deb package (Debian/Ubuntu) | [`animatem_0.2.2_arm64.deb`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem_0.2.2_arm64.deb) | 101 MB |
| x64 · .rpm package (Fedora/RHEL) | [`animatem-0.2.2.x86_64.rpm`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2.x86_64.rpm) | 94 MB |
| ARM64 · .rpm package (Fedora/RHEL) | [`animatem-0.2.2.aarch64.rpm`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animatem-0.2.2.aarch64.rpm) | 89 MB |
| x64 · AppImage | [`animATEM-0.2.2.AppImage`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2.AppImage) | 133 MB |
| ARM64 · AppImage | [`animATEM-0.2.2-arm64.AppImage`](https://github.com/stoatworks-labs/animATEM/releases/download/v0.2.2/animATEM-0.2.2-arm64.AppImage) | 135 MB |

</details>

All builds, checksums and release notes: [github.com/stoatworks-labs/animATEM/releases](https://github.com/stoatworks-labs/animATEM/releases).

macOS builds are signed and notarised and open normally. The Windows builds are unsigned, so SmartScreen warns once — see [Windows SmartScreen & Defender Firewall](#windows-smartscreen--defender-firewall) for the one-time click-through.

<!-- downloads:end -->

## Concept

![Pipeline concept: ATEM multiview over USB is captured, cropped per box, and recomposited into an editable preview before being pushed back to the switcher over Ethernet](docs/concept-diagram.svg)

## Screenshots

The multiview boxes below are a synthetic test-pattern feed (colour bars, big numbers, source labels), not a real ATEM's output, so these screenshots don't depend on hardware being connected. Everything else (the app chrome, data tables and layouts) is the real UI.

The touchscreen operator view, a composited multiview with tap-to-select regions and a row of function keys underneath:

![Touch tab: composited multiview canvas with Tap → PVW/PGM, Cut, Auto, FTB, and Kiosk function keys](docs/screenshots/touch.png)

The calibration screen, where you draw each multiview box's region once per capture resolution, or auto-create a starting grid sized to the live window count and drag the boxes and corners into place:

![Calibrate tab: instructions, an auto-create-boxes button, a canvas showing calibrated multiview box regions, and a window/live-source table below](docs/screenshots/calibrate.png)

The SuperSource editor, with Program (live) and Preview (editable, drag to move/resize) panes side by side, plus the memory bank:

![SuperSource tab: Program and Preview panes, a 4-box settings table, and the memory bank](docs/screenshots/supersource.png)

The DVE editor, with the same Program/Preview/Take pattern applied to a single upstream keyer:

![DVE tab: Program and Preview panes, fill/position/size settings, and the memory bank](docs/screenshots/dve.png)

The raw multiview passthrough and live ATEM state, useful while wiring things up:

![Live tab: raw multiview capture canvas and connection status](docs/screenshots/live.png)

## Stack

Electron + `electron-vite` + React + TypeScript, following the same
conventions as my other Electron control apps
(`presentation-commander-client/server`, `MicWizard`):
`src/{main,preload,renderer,shared}`, service classes under
`src/main/services/*.ts`.

ATEM Ethernet protocol control via
[`atem-connection`](https://github.com/Sofie-Automation/sofie-atem-connection)
(main process, UDP). UVC multiview capture via the renderer's
`navigator.mediaDevices.getUserMedia` (full Chromium context, no native
addon needed).

## Documentation

| Doc | Contents |
|---|---|
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | Operating it: multiview setup, calibration, Preview/Take, animation, memories, troubleshooting |
| [docs/API.md](docs/API.md) | The control-server protocol, state model, coordinate conversions, memories file format, IPC channels |
| [docs/DEVELOPING.md](docs/DEVELOPING.md) | Build, tests, and the coordinate work that is the hard part |

## Development

```sh
npm install
npm run dev
```

`npm run typecheck` and `npm run lint` before committing.

**Known install gotcha on this machine (Node v26.5.0):** `electron`'s
postinstall uses `extract-zip@2.0.1`, whose promise hangs forever on this
Node version instead of extracting or failing. `npm install` finishes, but
`node_modules/electron/dist` is left with no `Electron.app`, and
`npm run dev` fails with `spawn .../Electron ENOENT`. If that happens:

```sh
# find the cached zip extract-zip already downloaded
find ~/Library/Caches/electron -iname "electron-v*.zip"

# extract it with the system unzip instead (fast, doesn't hang)
rm -rf node_modules/electron/dist
mkdir -p node_modules/electron/dist
unzip -q <path-to-the-zip-above> -d node_modules/electron/dist

# recreate the marker file install.js normally writes (no trailing newline!)
printf "Electron.app/Contents/MacOS/Electron" > node_modules/electron/path.txt
```

### Testing

```sh
npm run test
```

Unit tests cover the pure box-geometry/drag/coordinate-conversion math and
the file-backed calibration/memory stores (`vitest`, no hardware needed).
The Companion module now lives in [its own repo](https://github.com/stoatworks-labs/companion-module-animatem) and carries its own
tests. CI (`.github/workflows/ci.yml`) runs typecheck/lint/test on every push
and PR; `.github/workflows/release.yml` builds installers for
Windows/macOS/Linux (x64 + arm64) on a `v*` tag.

## Status

The Phase 1 feature set is built: ATEM connection (standard switching:
cut/auto/FTB/program/preview/aux), UVC multiview capture, box calibration,
the SuperSource and DVE Program/Preview/Take workflow with drag-to-move/resize
editing, named memories, and the touchscreen operator UI with kiosk mode.
Everything has been exercised in isolated browser/Electron harnesses
(typecheck, lint and functional checks all pass), and the capture and
calibration path **has been run against a real ATEM Mini Extreme ISO**
(2026-07-17/18): the switcher's multiview came in over USB as a UVC device and
was cropped live. That session found a proper bug. The app had assumed
multiview `windowIndex` values run left to right and top to bottom, and they
don't, which produced completely wrong crops. Now you confirm each box against
a dropdown of the ATEM's actual live source names instead of typing an index,
and the fix was confirmed working on that switcher (commit `64a4ecb`).

**Still not confirmed on hardware:** the coordinate scale used for the
Preview panes' visual layout (see `superSourceCoords.ts` / `dveCoords.ts`)
is still a labelled placeholder, never calibrated against a real switcher,
and the cut/auto/FTB/recall command path has only been exercised in
harnesses. The starting grid the auto-create button seeds is a generic
`ceil(sqrt(N))` heuristic, not real per-model layout geometry.

The compositing workflow needs an ATEM Mini Pro/Extreme ISO with its USB
output set to **Multiview** (not the default, Program).

The local control server (`ws://127.0.0.1:51234`) and the
[Companion module](https://github.com/stoatworks-labs/companion-module-animatem) that talks to it are also
built and verified end to end: a real WebSocket client (including the
module's own compiled client code) connects, receives the initial
status/snapshot/memories state, and round-trips commands against a running
animATEM without errors. Like everything else, what the commands actually do
(cut/auto/recall) hasn't been checked against a real switcher yet.

Production packaging is verified too: `npm run build:mac` produces working
x64 + arm64 `.dmg`/`.zip` installers, signed by nobody (no Apple dev cert
yet), and the packaged arm64 `.app` boots cleanly on its own, with the full
Electron process tree up and the control server bound correctly. That's
separate from every other check in this project, which has run through
`npm run dev`.

## ⚠️ Security note

The local control server (`src/main/services/controlServer.ts`) binds to
`127.0.0.1:51234` with **no authentication**, so anything that can reach that
port on the local machine can cut/auto/FTB the switcher or recall a memory.
That's fine as long as it stays bound to localhost (the default, and the
only configuration this app supports at the moment). If you ever change that
binding to `0.0.0.0` or another address the network can reach, add
authentication first. As shipped, it isn't safe to expose beyond localhost.

## Windows SmartScreen & Defender Firewall

macOS builds are **Developer ID-signed and notarised by Apple**, so they open
normally, with no Gatekeeper warning and no quarantine step. The Windows
binaries **aren't** code-signed, so Windows still warns you the first time.

- **Windows**: SmartScreen shows *"Windows protected your PC"* →
  **More info** → **Run anyway**.
- **Windows Defender Firewall**: the first launch pops up *"Allow animATEM to communicate on
  these networks"*. Tick **Private** (and **Domain** on a managed network), because animATEM
  needs it to reach the ATEM switcher and expose its Companion control port. Deny it and
  the switcher will show as offline and Companion won't connect.
- **Linux**: no signing gate.

Per-artifact steps, self-signing, checksum verification and the Defender Firewall reset
procedure: **[docs/UNSIGNED.md](docs/UNSIGNED.md)**.

## Roadmap / TODO

- [ ] **Validate the switching commands against a real ATEM**: capture and calibration have been run against a Mini Extreme ISO (2026-07-17/18), but the cut/auto/recall command behaviour hasn't, and is still only verified in browser/Electron harnesses.
- [ ] **Calibrate coordinate scale**: the SuperSource/DVE Preview layout scale (`superSourceCoords.ts` / `dveCoords.ts`) is a labelled placeholder until there's real hardware to calibrate it against.
- [x] **Real multiview capture**: done 2026-07-17/18. A real Mini Extreme ISO's multiview came in over USB and was cropped live, which is how the `windowIndex` ordering bug was found.

<!-- attributions:start -->
This project is built on other people's work — see [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
<!-- attributions:end -->
