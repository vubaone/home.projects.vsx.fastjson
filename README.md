<div align="center">
  <img src="icon.png" width="128" height="128" alt="Fast JSON Logo">
  <h1>Fast JSON</h1>
  <p>A lightweight, zero-dependency VSCode extension for quick JSON operations.<br>
  Accessible instantly from the right-click context menu.</p>
</div>

---

## Features

Select any text in the editor, right-click, and choose **Fast JSON** to access:

| Command | Description |
|---|---|
| **Format / Beautify** | Pretty-print JSON with 2-space indentation |
| **Minify / Compact** | Collapse JSON to a single line with no extra whitespace |
| **Convert To Text** | Escape the selection into a JSON-safe string (`"` → `\"`, newlines → `\n`, etc.) |
| **Convert To JSON** | Unescape a previously escaped string back into raw JSON |

> The **Fast JSON** menu only appears when you have text selected.

## Error Handling

If the selected text is not valid JSON (for Format / Minify / Convert To JSON), you'll see a native VS Code error notification with the error message and the approximate line and column where the problem was found.

## Installation

### From Source

```bash
cd home.projects.vsx.fastjson
npm install -g @vscode/vsce   # one-time
vsce package                  # produces fastjson-1.0.0.vsix
code --install-extension fastjson-1.0.0.vsix
```

### Development

```bash
code --extensionDevelopmentPath="/path/to/home.projects.vsx.fastjson"
```
