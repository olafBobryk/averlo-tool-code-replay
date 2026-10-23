import { cpSync, lstatSync, realpathSync } from "node:fs"
import path from "node:path"

export function resolveSourceTarget(root, relative) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    throw new Error("Target must be a relative file inside the source workspace.")
  }
  const sourceRoot = realpathSync(root)
  const target = realpathSync(path.resolve(sourceRoot, relative))
  if (!target.startsWith(sourceRoot + path.sep) || !lstatSync(target).isFile()) {
    throw new Error("Target must be a file inside the source workspace.")
  }
  return target
}

export function copySourceWorkspace(source, destination) {
  const excluded = new Set(["node_modules", "recordings", "tmp", "dist", "out", "build", "coverage", "secrets"])
  cpSync(source, destination, {
    recursive: true,
    dereference: false,
    filter(file) {
      if (file === source) return true
      const name = path.basename(file)
      return !name.startsWith(".") && !excluded.has(name) &&
        !/^tsconfig\.next-/.test(name) && !/\.(?:pem|key|p12|pfx|mp4|webm|mov)$/i.test(name) &&
        !lstatSync(file).isSymbolicLink()
    }
  })
}

export async function stopProcessTree(child) {
  if (!child.pid) return
  const signal = (name) => {
    try {
      if (process.platform === "win32") child.kill(name)
      else process.kill(-child.pid, name)
    } catch (error) {
      if (error.code !== "ESRCH") throw error
    }
  }
  signal("SIGTERM")
  await new Promise(resolve => setTimeout(resolve, 300))
  signal("SIGKILL")
}
