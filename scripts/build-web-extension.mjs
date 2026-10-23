#!/usr/bin/env node
import path from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")

export async function buildWebExtension({ logLevel = "info" } = {}) {
  await build({
    entryPoints: [path.join(projectRoot, "extension", "browser.js")],
    outfile: path.join(projectRoot, "extension", "dist", "browser.js"),
    bundle: true,
    platform: "browser",
    format: "cjs",
    target: "es2022",
    external: ["vscode"],
    logLevel
  })
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined
if (invokedPath === fileURLToPath(import.meta.url)) {
  buildWebExtension().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
