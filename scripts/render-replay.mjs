#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { buildWebExtension } from "./build-web-extension.mjs"
import { generateReplayPlan } from "./replay-planner.mjs"
import { parseReplayOptions } from "./render-options.mjs"
import { copySourceWorkspace, resolveSourceTarget, stopProcessTree } from "./workspace.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const extensionPath = path.join(projectRoot, "extension")
const defaultStartDelayMs = 1600

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasArg(name) {
  return process.argv.includes(name)
}

function timestamp() {
  return new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replace(/\.\d{3}Z$/, "Z")
}

function requireCommand(command, hint) {
  const result = spawnSync(command, ["-version"], {
    stdio: "pipe",
    encoding: "utf8"
  })

  if (result.status !== 0) {
    throw new Error(`${command} was not found. ${hint}`)
  }

  return command
}

function resolveInside(root, relativePath) {
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error(`Path escapes workspace: ${relativePath}`)
  }
  return resolved
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : undefined
      server.close(() => {
        if (port) {
          resolve(port)
        } else {
          reject(new Error("Could not allocate a free port."))
        }
      })
    })
  })
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Server is still starting.
    }
    await sleep(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: options.stdio ?? "inherit",
    encoding: "utf8"
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`)
  }

  return result
}

function stripJsonComments(content) {
  let output = ""
  let inString = false
  let stringQuote = ""
  let escaped = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false
        output += char
      }
      continue
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false
        index += 1
      }
      continue
    }

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === stringQuote) {
        inString = false
        stringQuote = ""
      }
      continue
    }

    if (char === "\"" || char === "'") {
      inString = true
      stringQuote = char
      output += char
      continue
    }

    if (char === "/" && next === "/") {
      inLineComment = true
      index += 1
      continue
    }

    if (char === "/" && next === "*") {
      inBlockComment = true
      index += 1
      continue
    }

    output += char
  }

  return output.replace(/,\s*([}\]])/g, "$1")
}

function readJsonObject(filePath) {
  if (!existsSync(filePath)) {
    return {}
  }

  const content = readFileSync(filePath, "utf8")
  if (!content.trim()) {
    return {}
  }

  const value = JSON.parse(stripJsonComments(content))
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected a JSON object in ${filePath}`)
  }

  return value
}

function applyWorkspaceSettings(disposableWorkspace, { theme, zoomLevel }) {
  const vscodeDir = path.join(disposableWorkspace, ".vscode")
  const settingsPath = path.join(vscodeDir, "settings.json")
  const settings = readJsonObject(settingsPath)

  if (theme) {
    settings["workbench.colorTheme"] = theme
  }
  settings["window.zoomLevel"] = zoomLevel
  mkdirSync(vscodeDir, { recursive: true })
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8")
}

async function copyEditorText(page) {
  const modifier = process.platform === "darwin" ? "Meta" : "Control"
  await page.keyboard.press(`${modifier}+A`)
  await page.keyboard.press(`${modifier}+C`)
  await page.waitForTimeout(500)

  return await page.evaluate(async () => navigator.clipboard.readText())
}

async function main() {
  const startedAt = new Date().toISOString()
  const replayOptions = parseReplayOptions(process.argv.slice(2))

  if (!argValue("--source-workspace") || !argValue("--target")) {
    throw new Error("Supply --source-workspace and --target. Render real source, never an invented example.")
  }
  const sourceWorkspace = path.resolve(argValue("--source-workspace"))
  const target = argValue("--target")
  const width = Number(argValue("--width") ?? 1920)
  const height = Number(argValue("--height") ?? 1080)
  const themeValue = argValue("--theme")
  const theme = themeValue === undefined ? undefined : themeValue.trim()
  const extensionIdValue = argValue("--extension-id")
  const extensionId = extensionIdValue === undefined ? undefined : extensionIdValue.trim()

  if (hasArg("--theme") && !theme) {
    throw new Error("--theme requires a non-empty VS Code theme name.")
  }
  if (hasArg("--extension-id") && !extensionId) {
    throw new Error("--extension-id requires a non-empty Marketplace extension identifier.")
  }
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new Error("--width and --height require positive integers.")
  }

  if (!existsSync(sourceWorkspace)) {
    throw new Error(`Source workspace does not exist: ${sourceWorkspace}`)
  }

  const sourceTargetPath = resolveSourceTarget(sourceWorkspace, target)
  if (!existsSync(sourceTargetPath)) {
    throw new Error(`Target file does not exist: ${sourceTargetPath}`)
  }

  const finalContent = readFileSync(sourceTargetPath, "utf8")
  const replayPlan = generateReplayPlan({
    fileName: target,
    content: finalContent,
    pattern: replayOptions.typingPattern,
    seed: replayOptions.seed
  })
  const estimatedReplayDurationMs =
    defaultStartDelayMs + replayPlan.estimatedActionDurationMs
  const estimatedSeconds = Math.max(
    25,
    Math.ceil(estimatedReplayDurationMs / 1000) + 20
  )
  const secondsValue = argValue("--seconds")
  if (hasArg("--seconds") && (secondsValue === undefined || secondsValue.startsWith("--"))) {
    throw new Error("--seconds requires a positive number.")
  }
  const seconds = Number(secondsValue ?? estimatedSeconds)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("--seconds requires a positive number.")
  }
  if (seconds * 1000 < estimatedReplayDurationMs + 3000) {
    throw new Error(`The typing plan needs at least ${Math.ceil((estimatedReplayDurationMs + 3000) / 1000)} seconds. Increase --seconds or choose a shorter real file.`)
  }

  requireCommand("ffmpeg", "Install ffmpeg to convert Playwright video to MP4.")
  await buildWebExtension({ logLevel: "silent" })

  const runId = timestamp()
  const runRoot = path.join(projectRoot, "tmp", "render-workspaces", runId)
  const disposableWorkspace = path.join(runRoot, "workspace")
  const videoDir = path.join(runRoot, "video")
  const codingReplayDir = path.join(disposableWorkspace, ".coding-replay")
  const finalName = `final-${path.basename(target)}`
  const finalRelativePath = `.coding-replay/${finalName}`
  const finalPath = path.join(codingReplayDir, finalName)
  const targetPath = resolveInside(disposableWorkspace, target)
  const manifest = {
    version: 2,
    target,
    final: finalRelativePath,
    ui: {
      zoomLevel: replayOptions.zoomLevel,
      explorer: replayOptions.explorer
    },
    typing: {
      pattern: replayPlan.requestedPattern,
      effectivePattern: replayPlan.effectivePattern,
      seed: replayPlan.seed,
      planner: replayPlan.planner,
      ...(replayPlan.fallbackReason
        ? { fallbackReason: replayPlan.fallbackReason }
        : {})
    },
    timing: {
      startDelayMs: defaultStartDelayMs,
      estimatedReplayDurationMs
    },
    steps: replayPlan.steps
  }
  const outputPath = path.resolve(
    argValue("--out") ?? path.join(projectRoot, "recordings", `vscode-web-replay-${runId}.mp4`)
  )
  if (!/\.mp4$/i.test(outputPath)) throw new Error("--out must end in .mp4.")
  if (outputPath === sourceTargetPath) throw new Error("Output cannot overwrite the source file.")
  const reportPath = outputPath.replace(/\.mp4$/i, ".json")
  const sourceVideoPath = outputPath.replace(/\.mp4$/i, ".webm")

  mkdirSync(path.dirname(outputPath), { recursive: true })
  mkdirSync(runRoot, { recursive: true })
  mkdirSync(videoDir, { recursive: true })

  console.log(`Copying workspace: ${sourceWorkspace}`)
  copySourceWorkspace(sourceWorkspace, disposableWorkspace)
  applyWorkspaceSettings(disposableWorkspace, {
    theme,
    zoomLevel: replayOptions.zoomLevel
  })
  mkdirSync(codingReplayDir, { recursive: true })
  writeFileSync(finalPath, finalContent, "utf8")
  mkdirSync(path.dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, "", "utf8")
  writeFileSync(path.join(codingReplayDir, "replay.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

  const port = await freePort()
  const host = "localhost"
  const endpoint = `http://${host}:${port}`
  const serverArgs = [
    "vscode-test-web",
    "--browser",
    "none",
    "--host",
    host,
    "--port",
    String(port),
    "--extensionDevelopmentPath",
    extensionPath,
    ...(extensionId ? ["--extensionId", extensionId] : []),
    "--testRunnerDataDir",
    path.join(projectRoot, ".vscode-test-web"),
    disposableWorkspace
  ]

  console.log(`Starting hidden VS Code Web server: ${endpoint}`)
  const server = spawn(process.platform === "win32" ? "npx.cmd" : "npx", serverArgs, {
    cwd: projectRoot,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"]
  })

  let serverOutput = ""
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString()
  })
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString()
  })

  let browser
  let context

  try {
    await waitForHttp(endpoint, 90000)

    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({
      viewport: { width, height },
      recordVideo: {
        dir: videoDir,
        size: { width, height }
      },
      permissions: ["clipboard-read", "clipboard-write"]
    })

    const recordingStartedAt = Date.now()
    const page = await context.newPage()
    page.on("console", (message) => {
      serverOutput += `[browser:${message.type()}] ${message.text()}\n`
    })
    page.on("pageerror", (error) => {
      serverOutput += `[browser:pageerror] ${error.stack ?? error.message}\n`
    })
    await page.goto(endpoint)
    await page.waitForSelector(".monaco-workbench", { timeout: 120000 })
    const captureStartSeconds = (Date.now() - recordingStartedAt) / 1000
    await page.getByText("VS Code Replay complete").waitFor({ timeout: seconds * 1000 })
    await page.waitForTimeout(1000)
    const captureDurationSeconds = (Date.now() - recordingStartedAt) / 1000 - captureStartSeconds
    const observedWorkbench = await page.evaluate(() => {
      const sidebar = document.querySelector(".part.sidebar")
      if (!sidebar) {
        return { sidebarVisible: false, explorerVisible: false }
      }
      const style = getComputedStyle(sidebar)
      const bounds = sidebar.getBoundingClientRect()
      const sidebarVisible =
        style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0
      return {
        sidebarVisible,
        explorerVisible: sidebarVisible && /EXPLORER/i.test(sidebar.textContent ?? "")
      }
    })
    const expectedExplorerVisible = replayOptions.explorer === "visible"
    if (observedWorkbench.explorerVisible !== expectedExplorerVisible) {
      throw new Error(
        `Explorer state verification failed: requested ${replayOptions.explorer}, observed ${observedWorkbench.explorerVisible ? "visible" : "hidden"}.`
      )
    }
    const editorContent = await copyEditorText(page)
    const pageVideo = page.video()

    if (!pageVideo) {
      throw new Error("Playwright did not create a video for the page.")
    }

    const saveVideo = pageVideo.saveAs(sourceVideoPath)
    await context.close()
    context = undefined
    await saveVideo
    await browser.close()
    browser = undefined
    writeFileSync(targetPath, editorContent, "utf8")

    run("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-ss", String(captureStartSeconds),
      "-i",
      sourceVideoPath,
      "-t", String(captureDurationSeconds),
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ])

    const sourceUnchanged = readFileSync(sourceTargetPath, "utf8") === finalContent
    const verified = sourceUnchanged && editorContent === finalContent && readFileSync(targetPath, "utf8") === finalContent
    const finishedAt = new Date().toISOString()
    const report = {
      renderer: "vscode-test-web",
      rendererNote: "Actual VS Code Web in local headless Chromium. No Docker or hosted renderer.",
      sourceWorkspace,
      disposableWorkspace,
      target,
      targetPath,
      finalPath,
      sourceVideoPath,
      outputPath,
      resolution: `${width}x${height}`,
      width,
      height,
      timeoutSeconds: seconds,
      estimatedReplayDurationMs,
      verified,
      sourceUnchanged,
      captureStartSeconds,
      captureDurationSeconds,
      manifestVersion: manifest.version,
      ui: {
        zoomLevel: replayOptions.zoomLevel,
        explorer: replayOptions.explorer,
        observed: observedWorkbench
      },
      typing: {
        pattern: replayPlan.requestedPattern,
        effectivePattern: replayPlan.effectivePattern,
        seed: replayPlan.seed,
        planner: replayPlan.planner,
        fallbackReason: replayPlan.fallbackReason ?? null,
        actionCount: replayPlan.actionCount
      },
      serverEndpoint: endpoint,
      startedAt,
      finishedAt,
      createdAt: finishedAt
    }

    if (theme) {
      report.theme = theme
    }

    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")

    if (!verified) {
      throw new Error(`Replay verification failed. Report: ${reportPath}`)
    }

    console.log(`MP4 proof written: ${outputPath}`)
    console.log(`Run report written: ${reportPath}`)
  } catch (error) {
    if (serverOutput) {
      writeFileSync(path.join(runRoot, "vscode-web-server.log"), serverOutput, "utf8")
    }
    throw error
  } finally {
    if (context) {
      await context.close().catch(() => {})
    }
    if (browser) {
      await browser.close().catch(() => {})
    }
    await stopProcessTree(server)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
