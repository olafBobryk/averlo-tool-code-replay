# Renderer provenance

The planner, replay extension, manifest/executor and VS Code Web capture workflow derive from Olaf Bobryk's private `vscode-replay` repository at `ca4995d` (deterministic outside-in replay generation). The local checkout also supplied its reviewed third-party theme extension option. The original source repository was not modified.

Tool Studio V2 retains the same renderer lineage in its Linux hosted runtime. This package uses the standalone local VS Code Web runner so recipients do not need Docker, Vercel Sandbox or Studio credentials. It does not copy Studio account data, recovered client sources, themes, archives or generated recordings.

Distribution changes: declared Playwright dependency and pinned versions; Node 22 minimum; setup and prerequisite checks; explicit source/target instead of an author's absolute paths; readable zoom default; MJS/CJS planner support; source-copy exclusions and path checks; timeout preflight; process-group cleanup; source-unchanged verification; removal of editor loading and clipboard verification from the MP4; paired skill and existing Averlo tool-use terms.

## First real render — 23 October 2026

The repository was created privately at `https://github.com/olafBobryk/averlo-tool-code-replay` before capture. The skills CLI installed its complete root skill into an isolated Codex project. Fresh dependencies, browser setup, prerequisite checks and plan estimation passed.

That installed runtime at renderer revision `7347d4e` recorded its actual `scripts/render-options.mjs` in local headless VS Code Web: 1920 × 1080, Monokai, zoom 1.1, Explorer visible, paired typing, TypeScript planner, 688 actions, seed `derived-443644bc`, no fallback. The H.264 MP4 is 44.6 seconds. The report confirms `verified: true` and `sourceUnchanged: true`; a separate byte comparison also confirmed the source and final copied target match. The source SHA-256 is `1d2d51373d1795f0b1266a9c787741b5e592ee2a81d4a8b0a71b6ca403587223`.

The MP4 and its extracted poster are catalog assets, outside this distributable source repository. No mock editor, fabricated sample source, Docker service or hosted render job was used. Validation covers macOS ARM64; other platforms remain unverified. Browser playback and catalog delivery acceptance are maintained by the website project.

## Public distribution — 23 October 2026

At the owner's direction, the distributable repository became public after reviewing all tracked files and its three existing commits for credentials and sensitive filenames. Public installation and updates use the GitHub repository directly. The skill retains mandatory safe synchronization and a changelog before every use; private catalog keys and credential exchange are no longer part of the workflow. The original renderer repository remains separate. Public availability does not change the tool-use terms in LICENSE.

## Setup-free opening — version 1.0.1

Capture now starts from the replay extension's explicit editor-ready timestamp after workbench state, target-file opening and focus have settled. Startup editors are disabled and existing tabs are closed in the disposable workspace. A short 250 ms settled-editor beat precedes typing. The runner requires valid ready/complete lifecycle signals and records their capture boundary in the report.

The actual option parser was rendered again on macOS ARM64 with the existing Monokai/1920 × 1080/zoom 1.1/visible Explorer/paired settings. The MP4 is 43.08 seconds; the first decoded frame shows the empty target editor and the 0.6-second frame shows typing. The report confirms exact final source, unchanged original source and `captureStartEvent: "editor-ready"`. No fabricated source or replacement editor was used.

## Ready-made project packages — version 1.1.0

Three pinned, real MIT-licensed website repositories now ship with the tool and root skill: Markdoc documentation (21 page sources), Hono documentation (91), and Fastify website (9). Original source/content/assets and licenses are retained byte-for-byte; `UPSTREAM.json` records upstream revisions, exclusions, page paths and per-file hashes. Added workspace files provide recording settings; named presets read those settings instead of duplicating them. No fictional project or illustrative code was authored for these packages.

`npm run record` offers a name/number chooser. `npm run record -- <name>` and `npm run project:plan -- <name>` use the actual configured source file without installing or running the websites. The full source packages are browsable and customizable; each video replays one selected file. Maintainer archive generation verifies upstream hashes and packages only the reviewed file manifest, workspace and recording notes, excluding local additions and macOS metadata.

The tool's syntax checks, 22 tests and skill validation pass. Tests verify every imported source hash, page/target availability, original license, workspace settings and exact reconstruction of each actual default target. Optional builds of the upstream websites have not been validated; recording does not depend on them. Third-party package rights are documented in THIRD_PARTY.md independently of the Averlo tool-use terms.

All three named presets were recorded locally in actual VS Code Web on macOS ARM64: Markdoc's `components/Callout.js` (37.60 s), Hono's `worker.ts` (25.96 s) and Fastify's `src/lib/href.ts` (21.48 s). Each H.264 MP4 is 1920 × 1080, Monokai, zoom 1.1, visible Explorer and paired typing with the TypeScript planner and no fallback. Each report confirms `verified: true`, `sourceUnchanged: true`, `captureStartEvent: "editor-ready"` and `setupFramesExcluded: true`. Independent byte comparisons matched original, replayed target and final verification file. Opening and mid-replay frames were reviewed for every package. Videos and local reports remain ignored.
