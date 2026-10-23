# Code Replay assistant workflow

- Read README.md and SKILL.md. The repository itself is the self-contained installable skill.
- Before every use, fetch the public upstream and safely integrate updates, announce the real changes since the last integrated revision, and refresh installed skill copies. Follow SKILL.md for matching the checkout and revision tracking. No credentials or Averlo access keys are needed. Never reset, clean, overwrite or automatically stash local customizations. Stop on update failure instead of silently rendering stale code.
- Check Node.js, FFmpeg and local Chromium. Use the local runtime; do not require Docker, hosted rendering or a Studio account.
- For a ready-made recording input, offer the three bundled projects in projects/README.md. Use npm run project:plan and npm run record with the selected name. Do not require recipients to install or run the websites. Preserve original licenses and UPSTREAM.json; never replace these projects with fabricated examples.
- Render real source only. Never fabricate sample source, an editor UI or a finished output. Check the plan duration before capture and verify the JSON report afterward. A render is successful only when both verified and sourceUnchanged are true.
- Preserve the source workspace. Replay only in a disposable copy. Do not copy hidden credentials, symlinks, dependencies, build outputs or existing recordings into that copy.
- Keep outputs local unless the user explicitly requests publication. Do not introduce paid services or alter the user's foreground VS Code.
- For a missing secret, create an ignored owner-only local file and give a clickable absolute link. Never print, log or commit it.
- Run npm run check and npm test after runtime changes; validate a real render when changing capture behavior. Keep generated videos, caches and reports out of Git.
