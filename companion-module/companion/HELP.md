## animATEM

Connects to animATEM's local control server (a companion feature of the
[animATEM](https://github.com/allansargeant/animATEM) desktop app, running
on the same machine or LAN) to trigger standard switching, source
selection, and memory recall from Companion buttons.

### Setup

1. Have animATEM running and connected to your ATEM switcher.
2. Add this connection, set **Target IP** to `127.0.0.1` if Companion runs
   on the same machine as animATEM, otherwise the animATEM machine's LAN
   address.
3. **Target Port** defaults to `51234`, matching animATEM's control server.

### Notes

Recalling a memory from a Companion button pushes it straight to the
switcher (like recalling a bank on real switcher hardware) — this is
different from animATEM's own touchscreen UI, where recalling a memory
loads it into an editable preview first. There's no in-between step for a
physical button press.
