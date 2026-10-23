# Renderer provenance

The planner, replay extension, manifest/executor and VS Code Web capture workflow derive from Olaf Bobryk's private `vscode-replay` repository at `ca4995d` (deterministic outside-in replay generation). The local checkout also supplied its reviewed third-party theme extension option. The original source repository was not modified.

Tool Studio V2 retains the same renderer lineage in its Linux hosted runtime. This package uses the standalone local VS Code Web runner so recipients do not need Docker, Vercel Sandbox or Studio credentials. It does not copy Studio account data, recovered client sources, themes, archives or generated recordings.

Distribution changes: declared Playwright dependency and pinned versions; Node 22 minimum; setup and prerequisite checks; explicit source/target instead of an author's absolute paths; readable zoom default; MJS/CJS planner support; source-copy exclusions and path checks; timeout preflight; process-group cleanup; source-unchanged verification; removal of editor loading and clipboard verification from the MP4; paired skill and existing Averlo tool-use terms.

## First real render — 23 October 2026

The repository was created privately at `https://github.com/olafBobryk/averlo-tool-code-replay` before capture. The skills CLI installed its complete root skill into an isolated Codex project. Fresh dependencies, browser setup, prerequisite checks and plan estimation passed.

That installed runtime at renderer revision `7347d4e` recorded its actual `scripts/render-options.mjs` in local headless VS Code Web: 1920 × 1080, Monokai, zoom 1.1, Explorer visible, paired typing, TypeScript planner, 688 actions, seed `derived-443644bc`, no fallback. The H.264 MP4 is 44.6 seconds. The report confirms `verified: true` and `sourceUnchanged: true`; a separate byte comparison also confirmed the source and final copied target match. The source SHA-256 is `1d2d51373d1795f0b1266a9c787741b5e592ee2a81d4a8b0a71b6ca403587223`.

The MP4 and its extracted poster are catalog assets, outside this distributable source repository. No mock editor, fabricated sample source, Docker service or hosted render job was used. Validation covers macOS ARM64; other platforms remain unverified. Browser playback and catalog delivery acceptance are maintained by the website project.
