import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { chromium } from "playwright"

const checks = {
  node: Number(process.versions.node.split(".")[0]) >= 22,
  ffmpeg: spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0,
  chromium: existsSync(chromium.executablePath())
}
for (const [name, ok] of Object.entries(checks)) console.log(`${name}: ${ok ? "ready" : "missing"}`)
if (!checks.node) console.error("Use Node.js 22 or newer.")
if (!checks.ffmpeg) console.error("Install FFmpeg with your system package manager (macOS: brew install ffmpeg).")
if (!checks.chromium) console.error("Run npm run setup to install the local Playwright browser.")
if (Object.values(checks).some(ok => !ok)) process.exitCode = 1
