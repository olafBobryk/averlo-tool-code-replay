import path from "node:path"
import ts from "typescript"

const SUPPORTED_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"])
const PATTERNS = new Set(["scan", "paired", "human"])

const PRESETS = {
  scan: {
    chunkMin: 2,
    chunkMax: 9,
    delayMinMs: 16,
    delayMaxMs: 49,
    linePauseMinMs: 95,
    linePauseMaxMs: 95,
    structuralPauseMinMs: 0,
    structuralPauseMaxMs: 0,
    movePauseMinMs: 0,
    movePauseMaxMs: 0,
    topLevelPauseMinMs: 560,
    topLevelPauseMaxMs: 560
  },
  paired: {
    chunkMin: 1,
    chunkMax: 4,
    delayMinMs: 22,
    delayMaxMs: 60,
    linePauseMinMs: 110,
    linePauseMaxMs: 110,
    structuralPauseMinMs: 90,
    structuralPauseMaxMs: 90,
    movePauseMinMs: 70,
    movePauseMaxMs: 70,
    topLevelPauseMinMs: 420,
    topLevelPauseMaxMs: 420
  },
  human: {
    chunkMin: 1,
    chunkMax: 3,
    delayMinMs: 35,
    delayMaxMs: 95,
    linePauseMinMs: 140,
    linePauseMaxMs: 260,
    structuralPauseMinMs: 120,
    structuralPauseMaxMs: 280,
    movePauseMinMs: 100,
    movePauseMaxMs: 220,
    topLevelPauseMinMs: 500,
    topLevelPauseMaxMs: 900
  }
}

function hashString(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function createRandom(seed) {
  let state = hashString(seed) || 0x6d2b79f5
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function randomInteger(random, min, max) {
  return min + Math.floor(random() * (max - min + 1))
}

function scriptKindFor(fileName) {
  switch (path.extname(fileName).toLowerCase()) {
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS
    case ".jsx":
      return ts.ScriptKind.JSX
    case ".ts":
      return ts.ScriptKind.TS
    case ".tsx":
      return ts.ScriptKind.TSX
    default:
      return ts.ScriptKind.Unknown
  }
}

function diagnosticMessage(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
  if (typeof diagnostic.start !== "number" || !diagnostic.file) {
    return message
  }

  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${message}`
}

function collectSyntax(sourceFile) {
  const tokens = []
  const jsxPairs = []

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement
      const closing = node.closingElement
      jsxPairs.push({
        openStart: opening.end - 1,
        openEnd: opening.end,
        closeStart: closing.getStart(sourceFile),
        closeEnd: closing.end,
        kind: "jsx"
      })
    } else if (ts.isJsxFragment(node)) {
      jsxPairs.push({
        openStart: node.openingFragment.getStart(sourceFile),
        openEnd: node.openingFragment.end,
        closeStart: node.closingFragment.getStart(sourceFile),
        closeEnd: node.closingFragment.end,
        kind: "jsx-fragment"
      })
    }

    for (const child of node.getChildren(sourceFile)) {
      if (
        child.kind === ts.SyntaxKind.OpenParenToken ||
        child.kind === ts.SyntaxKind.CloseParenToken ||
        child.kind === ts.SyntaxKind.OpenBracketToken ||
        child.kind === ts.SyntaxKind.CloseBracketToken ||
        child.kind === ts.SyntaxKind.OpenBraceToken ||
        child.kind === ts.SyntaxKind.CloseBraceToken
      ) {
        tokens.push({
          kind: child.kind,
          start: child.getStart(sourceFile),
          end: child.end
        })
      }
      visit(child)
    }
  }

  visit(sourceFile)
  tokens.sort((left, right) => left.start - right.start || left.end - right.end)

  const matchingOpen = new Map([
    [ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.OpenParenToken],
    [ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.OpenBracketToken],
    [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.OpenBraceToken]
  ])
  const openKinds = new Set(matchingOpen.values())
  const stack = []
  const bracketPairs = []

  for (const token of tokens) {
    if (openKinds.has(token.kind)) {
      stack.push(token)
      continue
    }

    const expected = matchingOpen.get(token.kind)
    const opener = stack.at(-1)
    if (opener?.kind !== expected) {
      continue
    }

    stack.pop()
    bracketPairs.push({
      openStart: opener.start,
      openEnd: opener.end,
      closeStart: token.start,
      closeEnd: token.end,
      kind: "bracket"
    })
  }

  const pairs = [...bracketPairs, ...jsxPairs]
    .filter(
      (pair) =>
        pair.openStart >= 0 &&
        pair.openEnd > pair.openStart &&
        pair.closeStart >= pair.openEnd &&
        pair.closeEnd > pair.closeStart
    )
    .sort((left, right) => left.openStart - right.openStart || right.closeEnd - left.closeEnd)

  return {
    pairs: buildPairTree(pairs),
    topLevelEnds: sourceFile.statements.map((statement) => statement.end)
  }
}

function buildPairTree(pairs) {
  const roots = []
  const stack = []

  for (const pair of pairs) {
    const node = { ...pair, children: [] }

    while (stack.length > 0) {
      const parent = stack.at(-1)
      const nested =
        node.openStart >= parent.openEnd && node.closeEnd <= parent.closeStart
      if (nested) {
        break
      }
      stack.pop()
    }

    const parent = stack.at(-1)
    if (parent) {
      parent.children.push(node)
    } else {
      const previousRoot = roots.at(-1)
      if (previousRoot && node.openStart < previousRoot.closeEnd) {
        continue
      }
      roots.push(node)
    }

    stack.push(node)
  }

  return roots
}

function scanBlockEnds(content) {
  const matches = [...content.matchAll(/(?=^function |^export \{)/gm)]
  return matches.slice(1).map((match) => match.index).filter((index) => index > 0)
}

function adjacentKey(character, random) {
  const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
  const lower = character.toLowerCase()
  const row = rows.find((candidate) => candidate.includes(lower))
  if (!row) {
    return character === "a" ? "s" : "a"
  }

  const index = row.indexOf(lower)
  const neighbors = [row[index - 1], row[index + 1]].filter(Boolean)
  const replacement = neighbors[randomInteger(random, 0, neighbors.length - 1)]
  return character === lower ? replacement : replacement.toUpperCase()
}

function actionDurationMs(steps) {
  return steps.reduce((total, step) => {
    if (step.type === "pause") {
      return total + step.ms
    }
    return total + (step.delayAfterMs ?? 0)
  }, 0)
}

export function simulateReplaySteps(finalContent, steps) {
  let document = ""
  let cursor = 0

  const sourceSlice = (range) => {
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      !Number.isInteger(range[0]) ||
      !Number.isInteger(range[1]) ||
      range[0] < 0 ||
      range[1] < range[0] ||
      range[1] > finalContent.length
    ) {
      throw new Error(`Invalid source range: ${JSON.stringify(range)}`)
    }
    return finalContent.slice(range[0], range[1])
  }

  const insert = (text) => {
    document = document.slice(0, cursor) + text + document.slice(cursor)
    cursor += text.length
  }

  for (const step of steps) {
    switch (step.type) {
      case "insert":
        insert(sourceSlice(step.range))
        break
      case "pair": {
        const open = sourceSlice(step.open)
        const close = sourceSlice(step.close)
        insert(open + close)
        cursor -= close.length
        break
      }
      case "move":
        cursor += step.by
        if (cursor < 0 || cursor > document.length) {
          throw new Error(`Replay cursor moved outside the document: ${cursor}`)
        }
        break
      case "insertSynthetic":
        insert(step.text)
        break
      case "backspace": {
        const count = step.count
        if (!Number.isInteger(count) || count < 1 || count > cursor) {
          throw new Error(`Invalid replay backspace count: ${count}`)
        }
        document = document.slice(0, cursor - count) + document.slice(cursor)
        cursor -= count
        break
      }
      case "pause":
      case "save":
        break
      default:
        throw new Error(`Unknown replay step type: ${step.type}`)
    }
  }

  return { content: document, cursor }
}

export function generateReplayPlan({ fileName, content, pattern = "paired", seed }) {
  if (typeof fileName !== "string" || !fileName) {
    throw new Error("Replay planner requires a non-empty fileName.")
  }
  if (typeof content !== "string") {
    throw new Error("Replay planner requires string content.")
  }
  if (!PATTERNS.has(pattern)) {
    throw new Error(`Unknown typing pattern: ${pattern}`)
  }
  if (seed !== undefined && (typeof seed !== "string" || !seed.trim())) {
    throw new Error("Replay seed must be a non-empty string when supplied.")
  }

  const extension = path.extname(fileName).toLowerCase()
  const supported = SUPPORTED_EXTENSIONS.has(extension)
  const effectivePattern = supported ? pattern : "scan"
  const planner = supported && pattern !== "scan" ? "typescript" : "scan"
  const fallbackReason =
    !supported && pattern !== "scan"
      ? `Unsupported file extension ${extension || "(none)"}; using scan typing.`
      : undefined
  const resolvedSeed =
    seed?.trim() ||
    `derived-${hashString(`${fileName}\0${content}\0${pattern}`).toString(16).padStart(8, "0")}`
  const random = createRandom(resolvedSeed)
  const preset = PRESETS[effectivePattern]

  let pairs = []
  let topLevelEnds = scanBlockEnds(content)
  if (supported) {
    const sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(fileName)
    )
    if (sourceFile.parseDiagnostics.length > 0) {
      const diagnostics = sourceFile.parseDiagnostics.map(diagnosticMessage).join("\n")
      throw new Error(`Cannot plan invalid ${extension.slice(1).toUpperCase()} source:\n${diagnostics}`)
    }
    const syntax = collectSyntax(sourceFile)
    pairs = effectivePattern === "scan" ? [] : syntax.pairs
    topLevelEnds = effectivePattern === "scan" ? scanBlockEnds(content) : syntax.topLevelEnds
  }

  const steps = []
  let eligibleSinceCorrection = 0
  let nextCorrectionAt = randomInteger(random, 80, 160)
  let topLevelIndex = 0

  const delay = (minName, maxName) =>
    randomInteger(random, preset[minName], preset[maxName])

  function pushInsertRange(start, end) {
    if (end <= start) {
      return
    }
    steps.push({
      type: "insert",
      range: [start, end],
      delayAfterMs: delay("delayMinMs", "delayMaxMs")
    })
  }

  function pushChunkedRange(start, end) {
    let cursor = start
    while (cursor < end) {
      const size = randomInteger(random, preset.chunkMin, preset.chunkMax)
      const next = Math.min(end, cursor + size)
      pushInsertRange(cursor, next)
      cursor = next
    }
  }

  function emitText(start, end) {
    let spanStart = start
    let cursor = start

    const flush = (until) => {
      pushChunkedRange(spanStart, until)
      spanStart = until
    }

    while (cursor < end) {
      const character = content[cursor]
      if (character === "\n") {
        flush(cursor)
        steps.push({
          type: "insert",
          range: [cursor, cursor + 1],
          delayAfterMs: delay("linePauseMinMs", "linePauseMaxMs")
        })
        cursor += 1
        spanStart = cursor
        continue
      }

      if (effectivePattern === "human" && /[A-Za-z]/.test(character)) {
        eligibleSinceCorrection += 1
        if (eligibleSinceCorrection >= nextCorrectionAt) {
          flush(cursor)
          steps.push({
            type: "insertSynthetic",
            text: adjacentKey(character, random),
            delayAfterMs: delay("delayMinMs", "delayMaxMs")
          })
          steps.push({ type: "pause", ms: randomInteger(random, 140, 260) })
          steps.push({
            type: "backspace",
            count: 1,
            delayAfterMs: randomInteger(random, 70, 140)
          })
          pushInsertRange(cursor, cursor + 1)
          cursor += 1
          spanStart = cursor
          eligibleSinceCorrection = 0
          nextCorrectionAt = randomInteger(random, 80, 160)
          continue
        }
      }

      cursor += 1
    }

    flush(end)
  }

  function pushTopLevelPause() {
    if (preset.topLevelPauseMaxMs <= 0) {
      return
    }
    steps.push({
      type: "pause",
      ms: delay("topLevelPauseMinMs", "topLevelPauseMaxMs")
    })
  }

  function emitRootText(start, end) {
    let cursor = start
    while (topLevelIndex < topLevelEnds.length && topLevelEnds[topLevelIndex] <= end) {
      const boundary = topLevelEnds[topLevelIndex]
      if (boundary > cursor) {
        emitText(cursor, boundary)
      }
      pushTopLevelPause()
      cursor = boundary
      topLevelIndex += 1
    }
    emitText(cursor, end)
  }

  function consumeRootBoundaries(position) {
    while (topLevelIndex < topLevelEnds.length && topLevelEnds[topLevelIndex] <= position) {
      pushTopLevelPause()
      topLevelIndex += 1
    }
  }

  function emitRegion(start, end, regionPairs, depth) {
    let cursor = start
    for (const pair of regionPairs) {
      if (pair.openStart < cursor || pair.closeEnd > end) {
        continue
      }

      if (depth === 0) {
        emitRootText(cursor, pair.openStart)
      } else {
        emitText(cursor, pair.openStart)
      }

      steps.push({
        type: "pair",
        open: [pair.openStart, pair.openEnd],
        close: [pair.closeStart, pair.closeEnd],
        delayAfterMs: delay("structuralPauseMinMs", "structuralPauseMaxMs")
      })
      emitRegion(pair.openEnd, pair.closeStart, pair.children, depth + 1)
      steps.push({
        type: "move",
        by: pair.closeEnd - pair.closeStart,
        delayAfterMs: delay("movePauseMinMs", "movePauseMaxMs")
      })
      cursor = pair.closeEnd
      if (depth === 0) {
        consumeRootBoundaries(cursor)
      }
    }

    if (depth === 0) {
      emitRootText(cursor, end)
    } else {
      emitText(cursor, end)
    }
  }

  emitRegion(0, content.length, pairs, 0)
  steps.push({ type: "save" })

  const simulation = simulateReplaySteps(content, steps)
  if (simulation.content !== content) {
    throw new Error("Generated replay plan did not reconstruct the final source exactly.")
  }

  return {
    requestedPattern: pattern,
    effectivePattern,
    seed: resolvedSeed,
    planner,
    fallbackReason,
    steps,
    actionCount: steps.length,
    estimatedActionDurationMs: actionDurationMs(steps)
  }
}

export const replayPatterns = Object.freeze([...PATTERNS])
