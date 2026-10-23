const vscode = require("vscode")
const { validateManifest } = require("./replay-manifest")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function sourceSlice(finalContent, range) {
  if (
    !Array.isArray(range) ||
    range.length !== 2 ||
    !Number.isInteger(range[0]) ||
    !Number.isInteger(range[1]) ||
    range[0] < 0 ||
    range[1] < range[0] ||
    range[1] > finalContent.length
  ) {
    throw new Error(`Invalid replay source range: ${JSON.stringify(range)}`)
  }
  return finalContent.slice(range[0], range[1])
}

async function insertAtCursor(editor, text, cursorBeforeSuffix = 0) {
  const document = editor.document
  const position = editor.selection.active
  const offset = document.offsetAt(position)

  const applied = await editor.edit(
    (edit) => edit.insert(position, text),
    { undoStopBefore: false, undoStopAfter: false }
  )
  if (!applied) {
    throw new Error("VS Code rejected a replay insert operation.")
  }

  const nextOffset = offset + text.length - cursorBeforeSuffix
  const nextPosition = editor.document.positionAt(nextOffset)
  editor.selection = new vscode.Selection(nextPosition, nextPosition)
  editor.revealRange(
    new vscode.Range(nextPosition, nextPosition),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport
  )
}

async function backspace(editor, count) {
  const document = editor.document
  const cursorOffset = document.offsetAt(editor.selection.active)
  if (!Number.isInteger(count) || count < 1 || count > cursorOffset) {
    throw new Error(`Invalid replay backspace count: ${count}`)
  }

  const start = document.positionAt(cursorOffset - count)
  const end = document.positionAt(cursorOffset)
  const applied = await editor.edit(
    (edit) => edit.delete(new vscode.Range(start, end)),
    { undoStopBefore: false, undoStopAfter: false }
  )
  if (!applied) {
    throw new Error("VS Code rejected a replay backspace operation.")
  }

  const next = editor.document.positionAt(cursorOffset - count)
  editor.selection = new vscode.Selection(next, next)
}

function moveCursor(editor, by) {
  if (!Number.isInteger(by)) {
    throw new Error(`Invalid replay cursor movement: ${by}`)
  }
  const document = editor.document
  const nextOffset = document.offsetAt(editor.selection.active) + by
  if (nextOffset < 0 || nextOffset > document.getText().length) {
    throw new Error(`Replay cursor moved outside the document: ${nextOffset}`)
  }
  const next = document.positionAt(nextOffset)
  editor.selection = new vscode.Selection(next, next)
  editor.revealRange(
    new vscode.Range(next, next),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport
  )
}

async function executeReplaySteps(editor, finalContent, steps) {
  for (const step of steps) {
    switch (step.type) {
      case "insert":
        await insertAtCursor(editor, sourceSlice(finalContent, step.range))
        break
      case "pair": {
        const open = sourceSlice(finalContent, step.open)
        const close = sourceSlice(finalContent, step.close)
        await insertAtCursor(editor, open + close, close.length)
        break
      }
      case "move":
        moveCursor(editor, step.by)
        break
      case "insertSynthetic":
        if (typeof step.text !== "string" || step.text.length === 0) {
          throw new Error("Synthetic replay inserts require non-empty text.")
        }
        await insertAtCursor(editor, step.text)
        break
      case "backspace":
        await backspace(editor, step.count)
        break
      case "pause":
        if (!Number.isFinite(step.ms) || step.ms < 0) {
          throw new Error(`Invalid replay pause: ${step.ms}`)
        }
        await sleep(step.ms)
        continue
      case "save":
        await editor.document.save()
        continue
      default:
        throw new Error(`Unknown replay step type: ${step.type}`)
    }

    if (step.delayAfterMs) {
      await sleep(step.delayAfterMs)
    }
  }
}

module.exports = {
  executeReplaySteps,
  validateManifest
}
