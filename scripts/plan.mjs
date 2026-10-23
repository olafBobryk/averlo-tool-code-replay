import { readFileSync } from "node:fs"
import path from "node:path"
import { generateReplayPlan } from "./replay-planner.mjs"
import { parseReplayOptions } from "./render-options.mjs"
import { resolveSourceTarget } from "./workspace.mjs"

const args = process.argv.slice(2)
const value = key => args[args.indexOf(key) + 1]
if (!args.includes("--source-workspace") || !args.includes("--target")) {
  throw new Error("Supply --source-workspace and --target.")
}
const source = path.resolve(value("--source-workspace"))
const target = value("--target")
const options = parseReplayOptions(args)
const plan = generateReplayPlan({
  fileName: target,
  content: readFileSync(resolveSourceTarget(source, target), "utf8"),
  pattern: options.typingPattern,
  seed: options.seed
})
console.log(JSON.stringify({
  target, pattern: plan.requestedPattern, effectivePattern: plan.effectivePattern,
  seed: plan.seed, planner: plan.planner, fallbackReason: plan.fallbackReason ?? null,
  actionCount: plan.actionCount,
  estimatedSeconds: Math.ceil((1600 + plan.estimatedActionDurationMs) / 1000),
  minimumTimeoutSeconds: Math.ceil((4600 + plan.estimatedActionDurationMs) / 1000)
}, null, 2))
