function validateManifest(manifest) {
  if (manifest?.version !== 2) {
    throw new Error(
      "Replay manifest version 2 is required. Regenerate this workspace with the current renderer."
    )
  }
  if (!manifest.target || !manifest.final || !Array.isArray(manifest.steps)) {
    throw new Error("Replay manifest v2 requires target, final, and steps fields.")
  }
  if (!manifest.ui || !["visible", "hidden"].includes(manifest.ui.explorer)) {
    throw new Error("Replay manifest v2 requires ui.explorer to be visible or hidden.")
  }
  if (!Number.isFinite(manifest.ui.zoomLevel)) {
    throw new Error("Replay manifest v2 requires a finite ui.zoomLevel.")
  }
  if (
    !manifest.typing ||
    !["scan", "paired", "human"].includes(manifest.typing.pattern) ||
    typeof manifest.typing.seed !== "string" ||
    !manifest.typing.seed
  ) {
    throw new Error("Replay manifest v2 requires a typing pattern and resolved seed.")
  }
}

module.exports = {
  validateManifest
}
