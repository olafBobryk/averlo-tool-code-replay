# Averlo Code Replay

Turn a real source file into a coding video in actual VS Code Web. The local renderer plans edits, opens a disposable workspace in hidden Chromium, records the editor, creates an H.264 MP4 and checks that the final code exactly matches the original. Your source workspace stays unchanged.

No Docker, hosted render service or Studio account is required. The supported setup is Node.js 22 or newer, FFmpeg on PATH, and Playwright Chromium. macOS is the initial tested platform; Linux also needs Chromium's system libraries. Windows has not been validated.

## Install

```sh
npm ci
npm run setup
npm run doctor
```

Setup downloads Chromium. VS Code Web is downloaded locally on the first render, so the first run needs network access. Rendering runs on your computer. Install FFmpeg through your package manager if missing, for example `brew install ffmpeg` on macOS.

The repository root is also the installable `averlo-code-replay` skill. It includes the runtime and lockfile, so a skill installation does not depend on another author's filesystem. The Averlo catalog prompt supplies private repository access and a permanent read-only update key; see [SKILL.md](SKILL.md) and [AGENTS.md](AGENTS.md).

## Plan and render real code

Choose a real project and source file. `--target` is relative to `--source-workspace`.

```sh
npm run plan -- --source-workspace /absolute/project --target src/component.tsx
npm run render -- --source-workspace /absolute/project --target src/component.tsx --theme Monokai --seconds 90 --out /absolute/coding-video.mp4
```

For a first result without importing another project, render this tool's own option parser: set `--source-workspace` to this repository's absolute path and `--target scripts/render-options.mjs`. This is production source used by the renderer, not a sample or illustration.

`--seconds` limits how long completion may take; it does not force the video to that length. The plan command reports the minimum timeout before capture. The MP4 omits the editor's initial loading period and the final clipboard verification step.

| Option | Default | Purpose |
| --- | --- | --- |
| `--theme` | Workspace/default theme | Exact VS Code theme name |
| `--extension-id` | None | Install a third-party Marketplace theme for this local run |
| `--width`, `--height` | 1920, 1080 | Recording dimensions |
| `--zoom-level` | 1.1 | Native VS Code workbench zoom |
| `--explorer` | visible | `visible` or `hidden` |
| `--typing-pattern` | paired | `paired`, `human` or `scan` |
| `--seed` | Derived from source | Repeatable typing plan |
| `--seconds` | Planned duration + allowance | Completion timeout |
| `--out` | `recordings/` with timestamp | MP4 destination |

Paired typing builds brackets and JSX elements outside-in. Human typing adds pauses and occasional corrected keystrokes; all final source must still match exactly. JS, MJS, CJS, JSX, TS and TSX use the TypeScript planner. Other file types use scan typing and disclose the fallback in the report. Invalid supported source is rejected before recording.

## Outputs and checks

Each render writes an MP4, raw WebM and JSON report beside it. Check `verified: true` and `sourceUnchanged: true`, plus the reported theme, typing and Explorer state. Disposable workspaces and diagnostic logs live under `tmp/`; generated files are ignored by Git. Source copies omit hidden files/directories, dependencies, builds, keys, recordings and symlinks. Only use source you intend to show in the resulting footage.

```sh
npm run check
npm test
```

Planner tests reconstruct actual renderer and extension source. [The replay manifest](docs/replay-manifest.md) describes the range-based edit contract. [Provenance](docs/provenance.md) records the upstream renderer lineage and changes.

Personal and commercial output use is permitted under [the tool terms](LICENSE); redistribution or resale of the tool itself is not. Dependencies keep their own licenses.
