import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"
import { resolveSourceTarget } from "./workspace.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const projects = JSON.parse(readFileSync(path.join(root, "projects/catalog.json"), "utf8"))
const allowedOptions = new Set(["--target", "--out", "--theme", "--zoom-level", "--explorer", "--typing-pattern", "--seed", "--seconds", "--width", "--height", "--extension-id"])

export function projectCommand(id, options = [], plan = false) {
  const project = projects.find(item => item.id === id)
  if (!project) throw new Error(`Choose a project: ${projects.map(item => item.id).join(", ")}.`)
  for (let i = 0; i < options.length; i += 2) {
    if (!allowedOptions.has(options[i]) || options[i + 1] === undefined || options[i + 1].startsWith("--")) {
      throw new Error(`Invalid recording option: ${options[i]}. See README.md for supported options.`)
    }
  }
  const workspace = path.join(root, "projects", project.directory)
  const prepared = JSON.parse(readFileSync(resolveSourceTarget(workspace, project.workspace), "utf8"))
  const value = (key, fallback) => options.includes(key) ? options[options.indexOf(key) + 1] : fallback
  const target = value("--target", project.target)
  resolveSourceTarget(workspace, target)
  const args = [
    path.join(root, "scripts", plan ? "plan.mjs" : "render-replay.mjs"),
    "--source-workspace", workspace,
    "--target", target,
    "--theme", value("--theme", prepared.settings["workbench.colorTheme"]),
    "--zoom-level", value("--zoom-level", String(prepared.settings["window.zoomLevel"])),
    "--explorer", value("--explorer", project.explorer),
    "--typing-pattern", value("--typing-pattern", project.typingPattern)
  ]
  for (let i = 0; i < options.length; i += 2) {
    if (!["--target", "--theme", "--zoom-level", "--explorer", "--typing-pattern"].includes(options[i])) {
      args.push(options[i], options[i + 1])
    }
  }
  return { project, args }
}

function listProjects() {
  for (const [index, item] of projects.entries()) {
    console.log(`${index + 1}. ${item.title} (${item.id}) — ${item.pageCount} page sources`)
    console.log(`   ${item.description}\n   Records ${item.target}`)
  }
}

async function main() {
  const [mode = "list", ...supplied] = process.argv.slice(2)
  if (mode === "list") return listProjects()
  if (!["record", "plan"].includes(mode)) throw new Error("Use npm run projects, npm run record, or npm run project:plan.")
  let id = supplied[0]?.startsWith("--") ? undefined : supplied.shift()
  if (!id) {
    listProjects()
    if (!process.stdin.isTTY) throw new Error("Choose a project by name, for example: npm run record -- markdoc")
    const prompt = createInterface({ input: process.stdin, output: process.stdout })
    try {
      const choice = (await prompt.question("Choose a project name or number: ")).trim()
      id = projects[Number(choice) - 1]?.id ?? choice
    } finally { prompt.close() }
  }
  const { project, args } = projectCommand(id, supplied, mode === "plan")
  console.log(`\n${mode === "plan" ? "Planning" : "Recording"} ${project.title}. No site install or server is needed.\n`)
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
