# Record Markdoc documentation

This package contains the real [markdoc/docs](https://github.com/markdoc/docs) site at revision `0eec556dcf3ee5354bab43424b6ddc828590cbf9`, with 21 page source files and its supporting code/content. Source files are preserved byte-for-byte; the added workspace and recording notes configure Code Replay. See UPSTREAM.json and LICENSE for provenance and rights. Upstream example projects, CI and agent instruction directories are omitted.

Tell your coding assistant: “Use Code Replay to record the markdoc project.” It can use the tool's `npm run record -- markdoc` command. The default target is `components/Callout.js`; choose any other real file if preferred. The complete site source remains in the Explorer while the selected file is replayed.

Open `Code Replay.code-workspace` to browse/customize the project in VS Code. Run Code Replay from its own directory; recording requires no site dependencies, server, account or deployment. It records one selected source file at a time, not the running website.

Building the site separately is optional and unvalidated here; follow the original upstream README for that workflow. Upstream branding identifies the original project and does not imply its endorsement of Averlo.
