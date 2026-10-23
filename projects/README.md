# Ready-to-record projects

Choose a complete real project, then ask your assistant to record it. These are pinned source packages of existing public websites with multiple pages, navigation, supporting code, original assets and original licenses. They are not invented demo businesses. Recording replays one selected source file while the project's source tree appears in the Explorer.

| Choose | Project | Page sources | Default recording |
| --- | --- | ---: | --- |
| `markdoc` | [Markdoc documentation](https://github.com/markdoc/docs) | 21 | React Callout component (`components/Callout.js`) |
| `hono` | [Hono documentation](https://github.com/honojs/website) | 91 | Request-routing worker (`worker.ts`) |
| `fastify` | [Fastify website](https://github.com/fastify/website) | 9 | Navigation helper (`src/lib/href.ts`) |

Say “Use Code Replay to record Markdoc,” or run these commands from the Code Replay directory after the tool's first-time setup:

```sh
npm run record
# Or choose directly:
npm run record -- markdoc
npm run project:plan -- hono
npm run record -- fastify --out /absolute/fastify.mp4
```

The interactive command lists the three projects and asks for a name or number. Each project has a `Code Replay.code-workspace` with Monokai, readable zoom and its project folder configured. The named preset reads those workspace settings and uses visible Explorer and paired typing. Override settings through the same recording options described in the root README. To use another actual file, add `--target relative/file.ts`.

No project dependency installation, site server, database, login or Docker is needed to record. The tool itself still needs Node.js, FFmpeg and Chromium. Open the workspace to browse or customize a project; Code Replay always uses a disposable copy and verifies the original target is unchanged.

## Packages and provenance

The GitHub release includes an individual `code-replay-<name>.tar.gz` for each project and `SHA256SUMS`. The full skill/repository already includes all three, so recipients can select a project without another download. A separately extracted project can also be recorded with the generic `--source-workspace` and `--target` commands.

Each `UPSTREAM.json` pins the original commit, lists the page source files and records SHA-256 hashes of every imported file. Source is preserved byte-for-byte. CI, upstream agent instruction directories and separate example projects are omitted; documentation pages discussing examples remain part of the real sites. Counts refer to page source files in the snapshot, not dynamically generated routes. Original upstream READMEs and dependency locks are retained. Building those websites is optional and has not been validated as part of these recording packages.

Read each project's `RECORDING.md` for its target and workspace. See [THIRD_PARTY.md](../THIRD_PARTY.md) and each original `LICENSE` for rights; names and branding identify the upstream projects and do not imply endorsement. These bundled third-party sources retain their MIT licenses independently of the Averlo tool-use terms.

Maintainers can reproduce the archives with `npm run package:projects`. Packaging verifies the original source hashes and includes only manifest-listed files, recording notes and the workspace; it never sweeps up files added during local use.
