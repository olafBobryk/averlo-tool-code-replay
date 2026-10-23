# Replay Manifest v2

A replay workspace contains `.coding-replay/replay.json` plus the final source file referenced by `final`.

```json
{
  "version": 2,
  "target": "src/example.tsx",
  "final": ".coding-replay/final-example.tsx",
  "ui": {
    "zoomLevel": -1,
    "explorer": "visible"
  },
  "typing": {
    "pattern": "paired",
    "effectivePattern": "paired",
    "seed": "derived-53f4cafe",
    "planner": "typescript"
  },
  "timing": {
    "startDelayMs": 1600,
    "estimatedReplayDurationMs": 48200
  },
  "steps": [
    { "type": "insert", "range": [0, 4], "delayAfterMs": 31 },
    {
      "type": "pair",
      "open": [20, 21],
      "close": [54, 55],
      "delayAfterMs": 90
    },
    { "type": "move", "by": 1, "delayAfterMs": 70 },
    { "type": "save" }
  ]
}
```

## Fields

- `version`: must be `2`. Older flat pacing manifests are rejected.
- `target`: workspace-relative file to empty and replay.
- `final`: workspace-relative saved final source used by both actions and verification.
- `ui.zoomLevel`: native numeric VS Code `window.zoomLevel`.
- `ui.explorer`: `visible` or `hidden`.
- `typing.pattern`: requested `scan`, `paired`, or `human` pattern.
- `typing.effectivePattern`: actual pattern after an unsupported-language fallback.
- `typing.seed`: explicit or derived seed used to resolve all randomness before playback.
- `typing.planner`: `typescript` or `scan`; `fallbackReason` is present when applicable.
- `timing.startDelayMs`: pause after the editor opens.
- `timing.estimatedReplayDurationMs`: sum of the start delay and generated action delays.
- `steps`: deterministic operations executed in order.

All source ranges use JavaScript/VS Code UTF-16 offsets into the complete `final` content.

## Step Types

- `insert`: insert the exact final-source `range` at the cursor.
- `pair`: insert the `open` and `close` ranges together, leaving the cursor between them.
- `move`: move the cursor by the signed relative UTF-16 offset `by`.
- `insertSynthetic`: insert literal temporary text, used only for human corrections.
- `backspace`: delete `count` UTF-16 units immediately before the cursor.
- `pause`: wait for `ms` without editing.
- `save`: save the active document.

Editing steps can include `delayAfterMs`. The extension performs no random choices at playback time.

## Planner Behavior

For valid JS, JSX, TS, and TSX, the planner uses the TypeScript syntax tree to pair `()`, `[]`, `{}`, JSX elements, and JSX fragments. Strings, comments, regular expressions, generic angle brackets, and self-closing JSX tags are preserved without being mistaken for structural pairs.

The generated steps are simulated before rendering. Planning fails if the simulated content differs from the final source.
