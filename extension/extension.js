const fs = require("fs")
const path = require("path")
const vscode = require("vscode")
const { executeReplaySteps, validateManifest } = require("./replay-executor")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function workspaceRoot() {
  const folder = vscode.workspace.workspaceFolders?.[0]
  return folder ? folder.uri.fsPath : undefined
}

function resolveInside(root, relativePath) {
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error(`Replay path escapes workspace: ${relativePath}`)
  }
  return resolved
}

async function executeCommandIfAvailable(command) {
  try {
    await vscode.commands.executeCommand(command)
  } catch {
    // Some workbench commands vary by VS Code version.
  }
}

async function applyWorkbenchState(explorer) {
  await executeCommandIfAvailable("workbench.action.closePanel")
  await executeCommandIfAvailable("workbench.action.closeAuxiliaryBar")
  if (explorer === "visible") {
    await executeCommandIfAvailable("workbench.view.explorer")
  } else {
    await executeCommandIfAvailable("workbench.action.closeSidebar")
  }
}

async function runReplay() {
  const root = workspaceRoot()
  if (!root) {
    vscode.window.showErrorMessage("VS Code Replay needs an open workspace.")
    return
  }

  const manifestPath = path.join(root, ".coding-replay", "replay.json")
  if (!fs.existsSync(manifestPath)) {
    return
  }

  const manifest = readJson(manifestPath)
  validateManifest(manifest)

  const targetPath = resolveInside(root, manifest.target)
  const finalPath = resolveInside(root, manifest.final)
  const finalContent = fs.readFileSync(finalPath, "utf8")
  const targetUri = vscode.Uri.file(targetPath)

  fs.writeFileSync(targetPath, "", "utf8")
  await applyWorkbenchState(manifest.ui.explorer)

  const document = await vscode.workspace.openTextDocument(targetUri)
  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.One
  })
  await executeCommandIfAvailable("workbench.action.focusActiveEditorGroup")

  await sleep(manifest.timing?.startDelayMs ?? 1200)
  await executeReplaySteps(editor, finalContent, manifest.steps)
  vscode.window.setStatusBarMessage("VS Code Replay complete", 4000)
}

function activate(context) {
  const disposable = vscode.commands.registerCommand("vscodeReplay.start", runReplay)
  context.subscriptions.push(disposable)

  setTimeout(() => {
    runReplay().catch((error) => {
      vscode.window.showErrorMessage(`VS Code Replay failed: ${error.message}`)
    })
  }, 750)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
