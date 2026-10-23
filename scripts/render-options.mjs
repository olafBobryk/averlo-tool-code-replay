const EXPLORER_VALUES = new Set(["visible", "hidden"])
const TYPING_PATTERNS = new Set(["scan", "paired", "human"])

function argValue(argv, name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function hasArg(argv, name) {
  return argv.includes(name)
}

function requireValue(argv, name, fallback) {
  const value = argValue(argv, name)
  if (hasArg(argv, name) && (value === undefined || value.startsWith("--"))) {
    throw new Error(`${name} requires a value.`)
  }
  return value ?? fallback
}

export function parseReplayOptions(argv) {
  const zoomValue = requireValue(argv, "--zoom-level", "1.1")
  const zoomLevel = Number(zoomValue)
  if (!Number.isFinite(zoomLevel)) {
    throw new Error("--zoom-level requires a finite number.")
  }

  const explorer = requireValue(argv, "--explorer", "visible")
  if (!EXPLORER_VALUES.has(explorer)) {
    throw new Error("--explorer must be visible or hidden.")
  }

  const typingPattern = requireValue(argv, "--typing-pattern", "paired")
  if (!TYPING_PATTERNS.has(typingPattern)) {
    throw new Error("--typing-pattern must be scan, paired, or human.")
  }

  const seedValue = requireValue(argv, "--seed")
  const seed = seedValue === undefined ? undefined : seedValue.trim()
  if (hasArg(argv, "--seed") && !seed) {
    throw new Error("--seed requires a non-empty value.")
  }

  return { zoomLevel, explorer, typingPattern, seed }
}
