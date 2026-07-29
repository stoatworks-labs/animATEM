# animATEM — User Guide

For the operator. The [README](../README.md) covers the concept and installation; this is how to
run it, and what not to trust yet.

---

## 0. ⚠ This has never been run against a real ATEM

Everything is built and exercised — typecheck, lint, tests and functional checks all pass, the
control server round-trips real commands, the packaged app boots cleanly. **None of it has
touched a real switcher.**

Two consequences you need to hold in your head:

1. **The Preview panes' scale is a labelled placeholder.** The numbers ATEM uses for SuperSource
   and DVE box position and size are raw wire values whose real-world scale isn't documented
   anywhere reachable without hardware. animATEM guesses. **A box may be drawn at the wrong size
   or position relative to what the switcher will actually do.**
2. **What gets pushed is not affected by that guess.** Take sends the exact raw values you set,
   untouched. A wrong preview scale makes the *picture* wrong, not the *command*.
3. **The UVC capture path has only been tried against a generic webcam**, not a real ATEM
   multiview.

So: treat the preview as an indication, not a proof, until you have calibrated against real
output. Do not put this in front of an audience on its first outing.

This is an AI-assisted codebase, human-directed and reviewed. Review it before relying on it.

---

## 1. What you need

- An **ATEM Mini Pro or Extreme ISO** (Phase 1 family).
- **The switcher's USB output set to Multiview**, not the default Program. The compositing
  workflow reads the multiview feed — with USB set to Program you get one picture and none of
  the source boxes, and nothing will work as intended.
- A network route to the switcher for control, and the USB cable for capture.

---

## 2. What it does

Two things, and it's worth keeping them separate in your head:

**Standard switching** — cut, auto, fade-to-black, program/preview selection, aux routing. Plain
ATEM control over the network.

**SuperSource and DVE layout compositing** — the distinctive part. Rather than sending a layout
command and hoping, animATEM captures the switcher's **own multiview output over USB** (it
enumerates as a UVC webcam), crops the individual source boxes out of that live feed, and
recomposites them into your arrangement — **with real live pixels** — so you can see the layout
before it goes to air.

You then **Take** it to push it to the switcher, or **Animate** it (SuperSource only, §5).

---

## 3. Calibration comes first

The capture path needs aligning to the actual video before the composite means anything.

**A calibration profile is stored per resolution.** Change the multiview resolution and you need
to calibrate again — the app won't reuse the old profile, and it won't warn you that you're
running uncalibrated.

**Don't assume the composite is pixel-true without it.** An uncalibrated composite will look
plausible and be wrong, which is the worst failure mode available.

---

## 4. Preview, Take, and what's editable

The editor works Preview → Take, like the switcher itself:

- Drag a box to move it, drag a corner to resize.
- **SuperSource boxes scale uniformly** — one size value, so they stay square-proportioned.
- **DVE boxes have independent width and height.**
- Crops (SuperSource) and masks (DVE) are separate settings and are only applied when their
  enable flag is on.
- **Take** pushes the layout to the switcher.

---

## 5. Animating a SuperSource move

**The ATEM protocol has no native SuperSource tweening.** An upstream keyer's DVE is animated by
the switcher itself, in hardware, via fly-keyframes — SuperSource simply isn't.

So animATEM does it client-side: pick a duration and press **Animate** instead of **Take**, and
it eases into the target layout by streaming a fixed cadence of interpolated positions to the
switcher.

Two things follow from that, and both matter on a show:

- **It is at the mercy of the network and the app.** A hardware DVE fly is one command the
  switcher executes on its own; a SuperSource animation is a continuous stream from your laptop.
  A network hiccup, a busy machine or the app being backgrounded shows up in the move.
- **There is no DVE equivalent of Animate**, because there doesn't need to be — the switcher
  already does that one properly.

---

## 6. Memories

Named presets that capture a SuperSource or DVE arrangement. They are **animATEM's own**, stored
in a JSON file in the app's data directory — **entirely independent of the ATEM's own macro
system.** They don't appear on the switcher and won't survive a move to a different machine
unless you copy the file.

- Recall from **the app's own UI** loads the memory into an **editable Preview**. Nothing goes to
  air until you Take.
- Recall from **a Stream Deck / Companion button goes straight to air** (§7).
- Saving a memory with an existing name/id **replaces** it.
- **If the memories file is unreadable or corrupted, the app shows an empty list** rather than an
  error. "All my memories vanished" usually means a damaged file, not a deletion.

Back the file up before a show if the memories matter.

---

## 7. Stream Deck / Companion

A [Bitfocus Companion](https://bitfocus.io/companion) module ships in
[`companion-module/`](../companion-module/README.md). Buttons can trigger Cut, Auto, FTB, source
selection, memory recall and animated SuperSource recall, with feedback and variables for the
current program and preview input.

> **⚠ A Companion memory-recall button goes straight to air.** This is deliberate — a physical
> button press is treated as a physical action, the way a memory bank works on real switcher
> hardware — but it is the **opposite** of what the same recall does in the app's own UI, which
> loads into an editable Preview. **Label those buttons so nobody expects a preview.**

Other behaviours to know:

- **Commands are never acknowledged.** The module learns whether something worked by watching the
  next state update, not from a reply. A command sent to a disconnected switcher looks exactly
  like one that worked.
- **An unknown memory id does nothing, silently.**
- **Asking to animate a DVE memory does nothing, silently** — animation is SuperSource-only (§5).
- The memory list is pushed on connect and when the app broadcasts it; a surface can hold a stale
  list if memories change.

### ⚠ Security

The control server binds to `127.0.0.1:51234` with **no authentication**. Anything that can reach
that port **on the local machine** can cut, auto, FTB or recall a memory — i.e. put something on
air.

That's acceptable only because it's localhost-only, which is the default and the only supported
configuration. **Do not expose it to the network.** It has no authentication to add safety if you
do.

---

## 8. Troubleshooting

| Symptom | Cause |
|---|---|
| **No source boxes in the capture, just one picture** | The switcher's USB output is set to Program. It must be **Multiview** (§1). |
| **Composite is offset or the wrong scale** | Not calibrated, or calibrated at a different resolution — profiles are per-resolution (§3). |
| **Preview doesn't match what the switcher did** | Expected for now. The preview coordinate scale is an unverified placeholder; the *push* is exact (§0). |
| **A SuperSource animation stutters** | It's streamed from this machine, not run in the switcher. Network or CPU (§5). |
| **DVE has no Animate button** | Correct — the switcher animates DVEs itself in hardware (§5). |
| **A Companion button put something on air unexpectedly** | Memory recall from Companion is immediate by design (§7). |
| **A Companion button appears to do nothing** | Commands aren't acknowledged; the switcher may be disconnected. Watch the state feedback, not the button (§7). |
| **All memories disappeared** | Usually a corrupted memories file — it fails to an empty list rather than erroring (§6). |
| **Memories missing on another machine** | They're stored per-machine in the app's data directory, not on the switcher (§6). |
| **macOS says the app is damaged** | Unsigned build; see the README's Gatekeeper section. |

---

## See also

- [API.md](API.md) — the control protocol, state model and coordinate conversions
- [DEVELOPING.md](DEVELOPING.md) — building and extending
- [`companion-module/README.md`](../companion-module/README.md) — the Companion module
- [README](../README.md) — concept, status, security note
