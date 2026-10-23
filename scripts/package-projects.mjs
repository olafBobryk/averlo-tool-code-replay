import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { projects } from "./projects.mjs"
import { resolveSourceTarget } from "./workspace.mjs"
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const output = path.join(root, "recordings/project-packages")
mkdirSync(output, { recursive: true })
const temporary = mkdtempSync(path.join(tmpdir(), "code-replay-packages-"))
const sums = []
try {
  for (const project of projects) {
    const directory = path.join(root, "projects", project.directory)
    const provenance = JSON.parse(readFileSync(path.join(directory, "UPSTREAM.json"), "utf8"))
    // Package only reviewed upstream files and our workspace/notes. Local caches,
    // credentials or other files added while customizing never enter the archive.
    const files = [...Object.keys(provenance.sourceFiles), "UPSTREAM.json", "RECORDING.md", project.workspace]
    for (const file of files) {
      if (/[\r\n]/.test(file)) throw new Error("Unsupported archive filename.")
      const content = readFileSync(resolveSourceTarget(directory, file))
      const expected = provenance.sourceFiles[file]
      if (expected && createHash("sha256").update(content).digest("hex") !== expected) {
        throw new Error(`Upstream source changed: ${project.id}/${file}. Review provenance before packaging.`)
      }
    }
    const list = path.join(temporary, `${project.id}.txt`)
    writeFileSync(list, files.map(file => `${project.directory}/${file}`).join("\n") + "\n")
    const name = `code-replay-${project.id}.tar.gz`
    const result = spawnSync("tar", ["-czf", path.join(output, name), "-C", path.join(root, "projects"), "--no-recursion", "-T", list], { stdio: "inherit", env: { ...process.env, COPYFILE_DISABLE: "1" } })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Could not package ${project.title}.`)
    sums.push(`${createHash("sha256").update(readFileSync(path.join(output, name))).digest("hex")}  ${name}`)
    console.log(path.join(output, name))
  }
  writeFileSync(path.join(output, "SHA256SUMS"), sums.join("\n") + "\n")
} finally { rmSync(temporary, { recursive: true, force: true }) }
