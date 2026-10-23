---
name: averlo-code-replay
description: Render real source files as verified VS Code coding videos locally, with configurable theme and typing. Use for Code Replay recordings; runs in hidden Chromium without Docker or a hosted render service.
---

# Averlo Code Replay

This skill includes its renderer beside this file. Resolve paths from this skill directory; do not depend on an author's local checkout or a Studio account. Read [README.md](README.md) for setup and options.

## Update before every use

The public upstream is `https://github.com/olafBobryk/averlo-tool-code-replay.git`, branch `main`. No login, token or Averlo update key is required. Before EVERY use, reuse the existing matching source checkout, inspect its branch, commits and local changes, fetch upstream `main`, and review incoming commits and their actual diff. Never push to Averlo's source repository.

Fast-forward only when clean and safe. Preserve local commits and customizations; never reset, clean, overwrite or automatically stash them. Ask the user how to integrate changes when their work prevents a safe update. If fetching or integration fails, explain the blocker before rendering; do not silently claim an old copy is current.

Announce a concise changelog from the last successfully integrated upstream revision to the new revision, using the actual log and diff. On first use announce the starting revision; if unchanged say no updates were found. Keep the last integrated revision in a local state file outside the checkout, for example `~/.config/averlo/tools/code-replay-state.json`. Advance it only after successful integration. Announce available but unintegrated changes separately.

An installed skill may have no `.git` directory. Verify the repository root AND remote before Git operations so an unrelated ancestor project is never mistaken for this tool. If necessary, clone the public upstream into a dedicated source directory outside the installed skill, reuse that checkout on later runs, and render from it. Refresh an installed copy from the updated source or with `npx skills update`, inspecting and preserving installed customizations first. Verify the refreshed runtime matches the integrated revision before using it.

## Render

- Use the user's real source workspace and target. Resolve an absolute file to its nearest project root. Never invent source, use a mock editor, or substitute a slideshow for a rendered result. If no target was supplied, propose a small real file from the available project and resolve that choice before capture. For a first result from this tool itself, `scripts/render-options.mjs` is its real CLI option parser, not demo code.
- Preserve supplied theme, timing, dimensions and typing choices. Otherwise propose sensible settings suited to the requested video. `--seconds` is a timeout, not an output duration; typing determines length. Zoom defaults to 1.1, Explorer to visible, typing to paired. Built-in themes include Monokai and Default Dark Modern; third-party themes need `--extension-id` as well as their exact theme name.
- From the skill directory run `npm ci`, `npm run setup`, and `npm run doctor` on first installation. Node.js 22+, FFmpeg and local Chromium are required; Docker, a Studio login and paid services are not. Explain a missing prerequisite. Install it through the user's existing package manager when authorized; do not change their desktop editor.
- Run `npm run plan -- --source-workspace /absolute/project --target relative/file.tsx` with the chosen typing options. Check the estimate before recording. Increase the timeout or choose a shorter real file with the user if the requested timeout cannot fit.
- Run `npm run render -- --source-workspace /absolute/project --target relative/file.tsx --theme Monokai --seconds 90 --out /absolute/output.mp4`, adding the chosen options from the README. Work occurs in a disposable copy. Rendering must stay local.
- Read the adjacent JSON report. Return the MP4 only after `verified` and `sourceUnchanged` are true. Confirm `captureStartEvent` is `editor-ready` and `setupFramesExcluded` is true, and review the opening frames for a settled target editor rather than startup screens. Report theme, zoom, Explorer state, effective typing pattern, fallback if any, and output/report links. A failed render or a copied prompt is not a finished video. Open the real MP4 for review before offering customization.

Keep recordings, source imports, credentials and cache local. Permission to render does not authorize publishing the footage or redistributing the tool.
