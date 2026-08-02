# animATEM — Interfaces

| § | Interface | Source |
|---|---|---|
| [1](#1-control-server--websocket-12700151234) | Control server — WebSocket `127.0.0.1:51234` | `src/main/services/controlServer.ts`, `src/shared/protocol.ts` |
| [2](#2-state-model) | State model | `src/shared/protocol.ts` |
| [3](#3-coordinate-conversions) | Coordinate conversions | `src/renderer/src/compositor/` |
| [4](#4-memories-file-format) | Memories file | `src/main/services/memoryStore.ts` |
| [5](#5-ipc-channels) | Electron IPC channels | `src/preload/index.ts` |

> **None of this has been run against a real ATEM switcher.** The protocol and the state model
> are exercised end-to-end against a running animATEM instance — a real WebSocket client,
> including the Companion module's own compiled client, connects, receives the initial state and
> round-trips commands without error. What has *not* been verified is what the switcher does at
> the other end.

---

## 1. Control server — WebSocket `127.0.0.1:51234`

The surface third-party control surfaces use; the
[Companion module](https://github.com/stoatworks-labs/companion-module-animatem) is the reference client.

> **⚠ No authentication.** Anything that can reach that port on the local machine can cut, auto,
> FTB, change sources or recall a memory — i.e. put something on air. That is acceptable *only*
> because it binds to `127.0.0.1`, which is the default and currently the only supported
> configuration. **If you ever change the binding to `0.0.0.0`, add authentication first.**

It is deliberately separate from the renderer's IPC bridge: this one is network-facing, that one
is not.

### Connection

On connect, the server immediately pushes **three** messages without being asked — `status`,
`snapshot`, `memories` — so a client never needs an initial query. `snapshot` may be `null` if
no switcher is connected yet.

### Outbound (server → client)

```ts
{ type: 'status',   status: 'disconnected'|'connecting'|'connected'|'error' }
{ type: 'snapshot', snapshot: AtemSnapshot | null }
{ type: 'memories', memories: Memory[] }
```

`status` and `snapshot` are broadcast to every client on change. **`memories` is not** — it is
only sent on connect and when the app explicitly calls `broadcastMemories()`. A client that
caches the memory list can go stale.

### Inbound (client → server)

```ts
{ type: 'cut',        me?: number }
{ type: 'auto',       me?: number }
{ type: 'ftb',        me?: number }
{ type: 'setProgram', input: number, me?: number }
{ type: 'setPreview', input: number, me?: number }
{ type: 'setAux',     source: number, bus?: number }
{ type: 'recallMemory',       id: string }
{ type: 'animateSuperSource', id: string, durationMs?: number }
```

Behaviour that isn't in the shapes:

- **Nothing is ever acknowledged.** There is no reply, no error frame and no result. A client
  learns whether a command worked only by watching the next `snapshot`.
- **Malformed JSON is dropped silently.** So is an unknown `type`.
- **A failing command is caught and logged, not propagated.** A bad or unsupported command from
  a control surface must not crash the server or drop the connection, so failures are swallowed
  — which means a command against a disconnected switcher looks identical to one that worked.
- **An unknown memory `id` is a no-op**, silently.
- **`animateSuperSource` on a DVE memory is a no-op**, silently — animation is SuperSource-only
  (§3).

### ⚠ Memory recall from a control surface goes straight to air

This is the one place the control server behaves differently from the app's own UI, and it is
deliberate:

> The editor UI recalls a memory into an **editable Preview**, never straight to air. A Companion
> button press is a **physical, immediate action** — the same as recalling a memory bank on real
> switcher hardware — so `recallMemory` **pushes directly to the switcher**.

If you build a surface on this protocol, label those buttons accordingly. There is no
preview-only variant of `recallMemory` on the wire.

### ⚠ The protocol is duplicated by hand

companion-module-animatem's `src/protocol.ts` **mirrors** `src/shared/protocol.ts`. It is a
separate repo, so nothing enforces that by import — the two are kept in sync BY HAND, and a
change here breaks a Stream Deck button silently. The Companion module is
a separate npm package and cannot import from the app, so the two are kept in sync manually.

They are also **not identical**: the module's `Memory` types deliberately **omit the `layout`
field**, since a control surface only needs id/name/kind. Keep that trimming in mind — the two
files being different is expected; the *message shapes* being different is a bug.

---

## 2. State model

`AtemSnapshot` is the whole of what the app knows about the switcher:

```ts
{ productModel: string
  inputs: { id, shortName, longName }[]
  mixEffects: { index, programInput, previewInput, inTransition }[]
  superSources: { index, boxes: SuperSourceBoxState[] }[]
  upstreamKeyerDves: UpstreamKeyerDveState[]
  auxes: Record<number, number>
  multiViewers: { index, windows: { windowIndex, source }[] }[] }
```

**The field names deliberately mirror `atem-connection`'s own state shape** (`SuperSourceBox`,
`UpstreamKeyerDVESettings`) so IPC payloads pass between main and renderer with no translation
layer. Don't rename them for tidiness — the whole point is that there's nothing in between.

The two geometry types are shaped differently, and it matters:

| | SuperSource box | Upstream keyer DVE |
|---|---|---|
| Position | `x`, `y` | `positionX`, `positionY` |
| Size | `size` (**one value — boxes are square-scaled**) | `sizeX`, `sizeY` (**independent**) |
| Crop | `cropped`, `cropTop/Bottom/Left/Right` | `maskEnabled`, `maskTop/Bottom/Left/Right` |
| Sources | `source` | `fillSource`, `cutSource` |

`AtemBoxLayout` and `AtemDveLayout` are `Partial` versions used for memories and pushes — so a
memory can carry only the fields it means to set.

The control server's copy of `AtemSnapshot` (in the Companion module) is **narrower**: it carries
`productModel`, `inputs`, `mixEffects` and `auxes` only.

---

## 3. Coordinate conversions

`compositor/superSourceCoords.ts` and `compositor/dveCoords.ts` convert between the switcher's
raw wire values and normalized screen space.

```ts
const COORD_RANGE = 4000

// SuperSource
size    = box.size / 4000
centerX = 0.5 + box.x / 8000
centerY = 0.5 - box.y / 8000          // note the sign — Y is inverted

// DVE — same maths, different field names, independent width and height
width   = dve.sizeX / 4000
height  = dve.sizeY / 4000
```

> **⚠ `COORD_RANGE = 4000` is a labelled guess, not a documented constant.**
>
> The values themselves are confirmed as raw Int16/UInt16 wire values, from `atem-connection`'s
> `SuperSourceBoxParametersCommand` serializer. What is **not** documented anywhere reachable
> without a real switcher is their **real-world scale** — what a given number means as on-screen
> position or size.
>
> So the conversion is a best-effort guess **for the preview visualisation only.** It has **no
> bearing on what gets pushed to the switcher**: Take sends the exact raw values the operator
> set, untouched. A wrong `COORD_RANGE` makes the preview mis-scaled; it cannot make the push
> wrong.
>
> This is the first thing to calibrate against real hardware.

Each module also provides the **inverse** (`screenPositionToBoxXY`, `screenSizeToBoxSize`, and
the DVE equivalents) so a drag gesture in normalized screen space converts back to raw values.
If you change `COORD_RANGE`, both directions change together — that's why it's one constant per
module rather than inline numbers.

There is good `.spec.ts` coverage alongside each module, precisely because these conversions are
easy to get subtly wrong in ways that look plausible on screen. **Extend the specs when you touch
the maths** — a box that is 5% off looks fine in isolation and wrong next to a real switcher's
output.

`calibrationStore` exists because the UVC capture path has to be aligned to the actual video.
**Don't assume the composite is pixel-true without a calibration profile.**

### SuperSource animation is client-side; DVE animation is not

The ATEM protocol has **no native SuperSource tweening**. An upstream keyer's DVE *is* animated
by the switcher itself, via hardware fly-keyframes. So:

- **DVE** — the switcher animates. One command.
- **SuperSource** — animATEM eases into the target layout **client-side**: a fixed-cadence stream
  of interpolated positions, not a single command.

That is why `animateSuperSource` exists on the control protocol and there is no DVE equivalent,
and why SuperSource animation is at the mercy of the network and the app's own timing in a way
DVE animation isn't. Easing lives in `src/shared/easing.ts`,
interpolation in `src/shared/superSourceAnimation.ts` — both shared between main and renderer so
the preview and the push animate identically.

---

## 4. Memories file format

App-level presets, **independent of the ATEM's own macro system**. Stored as JSON at
`memories.json` in Electron's `userData` directory:

```json
[ { "id": "…", "kind": "supersource", "name": "Two box",
    "superSourceIndex": 0, "layout": { "boxes": [ { "index": 0, "enabled": true, … } ] } },
  { "id": "…", "kind": "dve", "name": "Corner PIP",
    "meIndex": 0, "keyerIndex": 0, "layout": { "positionX": …, "sizeX": …, … } } ]
```

- **The whole file is rewritten on every save or delete.** There is no locking.
- **`saveMemory` upserts by `id`** — it filters out any existing entry with the same id and
  appends, so saving moves an existing memory to the end of the list.
- **An unreadable or malformed file returns an empty list**, silently. A corrupted
  `memories.json` presents as "all my memories are gone", not as an error.
- Layouts are `Partial`, so a memory only carries the fields it sets.

---

## 5. IPC channels

Internal — the renderer's bridge, not network-facing.

| Group | Channels |
|---|---|
| Connection | `atem:connect(host)`, `atem:disconnect`, `atem:status`, `atem:snapshot` |
| Switching | `atem:cut(me?)`, `atem:auto(me?)`, `atem:ftb(me?)`, `atem:program(input, me?)`, `atem:preview(input, me?)`, `atem:aux(source, bus?)` |
| Layout push | `atem:push-supersource(layout, ssrcId)`, `atem:animate-supersource(layout, ssrcId, durationMs)`, `atem:push-dve(layout, meIndex, keyerIndex)` |
| Calibration | `calibration:get(resolutionKey)`, `calibration:save(profile)` |
| Memories | `memory:list`, `memory:save(memory)`, `memory:delete(id)` |
| Window | `window:toggle-kiosk`, `window:is-kiosk` |
| Events (main → renderer) | `atem:status`, `atem:snapshot`, `atem:error` |

Calibration profiles are keyed by **resolution**, so a different multiview resolution needs its
own calibration.

---

## See also

- [USER-GUIDE.md](USER-GUIDE.md) — operating it
- [DEVELOPING.md](DEVELOPING.md) — build, tests, the coordinate work
- [companion-module-animatem](https://github.com/stoatworks-labs/companion-module-animatem) — the Companion module
- [README](../README.md) — concept, status, security note
