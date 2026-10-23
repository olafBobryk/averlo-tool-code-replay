import assert from "node:assert/strict"
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { generateReplayPlan, simulateReplaySteps } from "../scripts/replay-planner.mjs"
import { parseReplayOptions } from "../scripts/render-options.mjs"
import { resolveSourceTarget, copySourceWorkspace } from "../scripts/workspace.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
for (const target of ["scripts/render-options.mjs", "scripts/workspace.mjs", "extension/browser.js", "extension/replay-manifest.js"]) {
  for (const pattern of ["paired", "human", "scan"]) {
    test(`${pattern} reconstructs actual ${target}`, () => {
      const content = readFileSync(path.join(root, target), "utf8")
      const plan = generateReplayPlan({ fileName: target, content, pattern })
      assert.equal(simulateReplaySteps(content, plan.steps).content, content)
      assert.equal(plan.effectivePattern, pattern)
      assert.ok(plan.actionCount > 0)
      assert.deepEqual(generateReplayPlan({ fileName: target, content, pattern }), plan)
    })
  }
}

test("default zoom is usable and unsupported user options are rejected", () => {
  assert.equal(parseReplayOptions([]).zoomLevel, 1.1)
  assert.throws(() => parseReplayOptions(["--zoom-level", "nope"]), /finite number/)
  assert.throws(() => parseReplayOptions(["--explorer", "maybe"]), /visible or hidden/)
  assert.throws(() => parseReplayOptions(["--typing-pattern", "fast"]), /scan, paired, or human/)
})

test("target resolution prevents escaping the actual source workspace", () => {
  assert.equal(resolveSourceTarget(root, "extension/browser.js"), path.join(root, "extension/browser.js"))
  assert.throws(() => resolveSourceTarget(root, "../vscode-replay/README.md"), /relative file/)
  assert.throws(() => resolveSourceTarget(root, root + "/README.md"), /relative file/)
})

test("real workspace copy includes source and excludes caches and hidden files", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "averlo-replay-copy-"))
  try {
    copySourceWorkspace(root, temporary + "/workspace")
    assert.equal(readFileSync(temporary + "/workspace/extension/browser.js", "utf8"), readFileSync(root + "/extension/browser.js", "utf8"))
    assert.equal(existsSync(temporary + "/workspace/node_modules"), false)
    assert.equal(existsSync(temporary + "/workspace/.gitignore"), false)
    assert.equal(existsSync(temporary + "/workspace/.git"), false)
    assert.equal(existsSync(temporary + "/workspace/recordings"), false)
  } finally { rmSync(temporary, { recursive: true, force: true }) }
})
