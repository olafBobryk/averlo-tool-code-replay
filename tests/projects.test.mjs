import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { projects, projectCommand } from "../scripts/projects.mjs"
import { generateReplayPlan, simulateReplaySteps } from "../scripts/replay-planner.mjs"
import { resolveSourceTarget } from "../scripts/workspace.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
for (const project of projects) {
  test(`${project.id} has intact real upstream sources, pages and license`, () => {
    const directory = path.join(root, "projects", project.directory)
    const upstream = JSON.parse(readFileSync(path.join(directory, "UPSTREAM.json"), "utf8"))
    assert.equal(upstream.repository, project.upstream)
    assert.equal(upstream.revision, project.revision)
    assert.equal(upstream.license, "MIT")
    assert.match(readFileSync(resolveSourceTarget(directory, upstream.licenseFile), "utf8"), /Permission is hereby granted/)
    assert.equal(project.sourceFileCount, Object.keys(upstream.sourceFiles).length)
    assert.equal(project.pageCount, upstream.pageFiles.length)
    assert.ok(project.pageCount >= 5)
    for (const file of upstream.pageFiles) assert.ok(upstream.sourceFiles[file], `Missing page: ${file}`)
    for (const [file, expected] of Object.entries(upstream.sourceFiles)) {
      assert.equal(createHash("sha256").update(readFileSync(resolveSourceTarget(directory, file))).digest("hex"), expected, file)
    }
  })
  test(`${project.id} preset reads workspace settings and reconstructs its real target`, () => {
    const { args } = projectCommand(project.id, [], true)
    const value = option => args[args.indexOf(option) + 1]
    const workspace = JSON.parse(readFileSync(path.join(value("--source-workspace"), project.workspace), "utf8"))
    assert.equal(value("--theme"), workspace.settings["workbench.colorTheme"])
    assert.equal(value("--zoom-level"), String(workspace.settings["window.zoomLevel"]))
    const source = readFileSync(resolveSourceTarget(value("--source-workspace"), value("--target")), "utf8")
    const plan = generateReplayPlan({ fileName: value("--target"), content: source, pattern: value("--typing-pattern") })
    assert.equal(simulateReplaySteps(source, plan.steps).content, source)
    assert.equal(plan.effectivePattern, "paired")
    assert.equal(plan.fallbackReason, undefined)
    for (const file of project.otherTargets) resolveSourceTarget(value("--source-workspace"), file)
  })
}
test("project selection rejects workspace escape and malformed overrides", () => {
  assert.throws(() => projectCommand("../markdoc"), /Choose a project/)
  assert.throws(() => projectCommand("markdoc", ["--target", "../../README.md"]), /relative file/)
  assert.throws(() => projectCommand("markdoc", ["--source-workspace", "/tmp"]), /Invalid recording option/)
  assert.throws(() => projectCommand("markdoc", ["--theme"]), /Invalid recording option/)
  const { args } = projectCommand("markdoc", ["--target", "components/Heading.js", "--theme", "Default Dark Modern", "--out", "/tmp/project.mp4"])
  assert.equal(args[args.indexOf("--target") + 1], "components/Heading.js")
  assert.equal(args[args.indexOf("--theme") + 1], "Default Dark Modern")
  assert.equal(args[args.indexOf("--out") + 1], "/tmp/project.mp4")
})
