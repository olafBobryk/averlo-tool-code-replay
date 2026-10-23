# Renderer provenance

The planner, replay extension, manifest/executor and VS Code Web capture workflow derive from Olaf Bobryk's private `vscode-replay` repository at `ca4995d` (deterministic outside-in replay generation). The local checkout also supplied its reviewed third-party theme extension option. The original source repository was not modified.

Tool Studio V2 retains the same renderer lineage in its Linux hosted runtime. This package uses the standalone local VS Code Web runner so recipients do not need Docker, Vercel Sandbox or Studio credentials. It does not copy Studio account data, recovered client sources, themes, archives or generated recordings.

Distribution changes: declared Playwright dependency and pinned versions; Node 22 minimum; setup and prerequisite checks; explicit source/target instead of an author's absolute paths; readable zoom default; MJS/CJS planner support; source-copy exclusions and path checks; timeout preflight; process-group cleanup; source-unchanged verification; removal of editor loading and clipboard verification from the MP4; paired skill and existing Averlo tool-use terms.

The first preview must be a real local render from this packaged repository after it has been committed and pushed to its private GitHub repository. Record actual verification evidence separately after it occurs.
