const vscode = require("vscode")
const { executeReplaySteps, validateManifest } = require("./replay-executor")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

async function readJson(uri) {
  const bytes = await vscode.workspace.fs.readFile(uri)
  return JSON.parse(textDecoder.decode(bytes))
}

function workspaceRoot() {
  const folder = vscode.workspace.workspaceFolders?.[0]
  return folder ? folder.uri : undefined
}

function resolveInside(root, relativePath) {
  return vscode.Uri.joinPath(root, ...relativePath.split("/").filter(Boolean))
}

async function executeCommandIfAvailable(command) {
  try {
    await vscode.commands.executeCommand(command)
  } catch {
    // Some workbench commands vary by VS Code build.
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
  console.log("VS Code Replay web runner starting.")
  const root = workspaceRoot()
  if (!root) {
    vscode.window.showErrorMessage("VS Code Replay needs an open workspace.")
    return
  }

  const manifestUri = resolveInside(root, ".coding-replay/replay.json")
  const manifest = await readJson(manifestUri)
  validateManifest(manifest)

  const targetUri = resolveInside(root, manifest.target)
  const finalUri = resolveInside(root, manifest.final)
  const finalContent = textDecoder.decode(await vscode.workspace.fs.readFile(finalUri))

  await vscode.workspace.fs.writeFile(targetUri, textEncoder.encode(""))
  await applyWorkbenchState(manifest.ui.explorer)

  const document = await vscode.workspace.openTextDocument(targetUri)
  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.One
  })
  await executeCommandIfAvailable("workbench.action.focusActiveEditorGroup")

  await sleep(manifest.timing?.startDelayMs ?? 1200)
  await executeReplaySteps(editor, finalContent, manifest.steps)

  console.log("VS Code Replay web runner complete.")
  vscode.window.setStatusBarMessage("VS Code Replay complete", 8000)
}

function activate(context) {
  console.log("VS Code Replay web extension activated.")
  const disposable = vscode.commands.registerCommand("vscodeReplay.start", runReplay)
  context.subscriptions.push(disposable)

  setTimeout(() => {
    runReplay().catch((error) => {
      console.error(`VS Code Replay failed: ${error.stack ?? error.message}`)
      vscode.window.showErrorMessage(`VS Code Replay failed: ${error.message}`)
    })
  }, 750)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
