---
name: averlo-code-replay
description: Render real source files as verified VS Code coding videos locally, with configurable theme and typing. Use for Code Replay recordings; runs in hidden Chromium without Docker or a hosted render service.
---

# Averlo Code Replay

This skill includes its renderer beside this file. Resolve paths from this skill directory; do not depend on an author's local checkout or a Studio account. Read [README.md](README.md) for setup and options.

## Update before every use

Use the tool's private Averlo update key supplied by the catalog handoff, normally stored in the owner's `~/.config/averlo/tools/vscode-replay.json`, outside the checkout. Privately exchange it at its saved endpoint for fresh single-repository GitHub read credentials. Never print either credential, put it in a remote URL, or commit it. Use a temporary credential helper and remove it afterward.

Reuse the existing matching checkout. Inspect its branch, local commits and changes, fetch the supplied revision, and review incoming changes. Fast-forward only when safe; preserve all local customizations and ask how to integrate conflicts. Announce the changes since the last successfully integrated revision from the real log/diff, or say nothing changed. Record that revision outside the checkout. Refresh an installed copy of this skill from the updated checkout. If update access fails, explain the blocker before rendering; do not silently use stale code. The repository owner may use their existing authenticated Git access instead of a catalog key, with the same fetch, integration and announcement steps.

## Render

- Use the user's real source workspace and target. Resolve an absolute file to its nearest project root. Never invent source, use a mock editor, or substitute a slideshow for a rendered result. If no target was supplied, propose a small real file from the available project and resolve that choice before capture. For a first result from this tool itself, `scripts/render-options.mjs` is its real CLI option parser, not demo code.
- Preserve supplied theme, timing, dimensions and typing choices. Otherwise propose sensible settings suited to the requested video. `--seconds` is a timeout, not an output duration; typing determines length. Zoom defaults to 1.1, Explorer to visible, typing to paired. Built-in themes include Monokai and Default Dark Modern; third-party themes need `--extension-id` as well as their exact theme name.
- From the skill directory run `npm ci`, `npm run setup`, and `npm run doctor` on first installation. Node.js 22+, FFmpeg and local Chromium are required; Docker, a Studio login and paid services are not. Explain a missing prerequisite. Install it through the user's existing package manager when authorized; do not change their desktop editor.
- Run `npm run plan -- --source-workspace /absolute/project --target relative/file.tsx` with the chosen typing options. Check the estimate before recording. Increase the timeout or choose a shorter real file with the user if the requested timeout cannot fit.
- Run `npm run render -- --source-workspace /absolute/project --target relative/file.tsx --theme Monokai --seconds 90 --out /absolute/output.mp4`, adding the chosen options from the README. Work occurs in a disposable copy. Rendering must stay local.
- Read the adjacent JSON report. Return the MP4 only after `verified` and `sourceUnchanged` are true. Report theme, zoom, Explorer state, effective typing pattern, fallback if any, and output/report links. A failed render or a copied prompt is not a finished video. Open the real MP4 for review before offering customization.

Keep recordings, source imports, credentials and cache local. Permission to render does not authorize publishing the footage or redistributing the tool.
