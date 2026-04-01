<div align="center">
  <img src="https://raw.githubusercontent.com/vubaone/home.projects.vsx.fastjson/main/icon.png" width="128" height="128" alt="Fast JSON Logo">
  <h1>Fast JSON</h1>
  <p>A lightweight, zero-dependency VS Code extension for quick JSON operations.<br>
  Accessible instantly from the right-click context menu.</p>
  <p><strong>Website:</strong> <a href="https://vuba.one">vuba.one</a> · <strong>Source:</strong> <a href="https://github.com/vubaone/home.projects.vsx.fastjson">GitHub</a></p>
</div>

---

## Features

Select any text in the editor, right-click, and choose **Fast JSON** to access:

| Command | Description |
|---|---|
| **Format / Beautify** | Pretty-print JSON with 2-space indentation |
| **Minify / Compact** | Collapse JSON to a single line with no extra whitespace |
| **Convert To Text** | Minifies the JSON selection and escapes it into a JSON-safe string (`"` → `\"`, newlines → `\n`, etc.) |
| **Convert To JSON** | Unescapes a string back into raw JSON and automatically beautifies it |
| **Copy Flat Key** | Extracts and copies the full dot-separated JSON path (e.g., `user.contact.email`) of the cursor's location |

> The **Fast JSON** root menu is always visible. Formatting and conversion tools appear when text is selected, while **Copy Flat Key** is available regardless of selection.

## Project Info

- Publisher: **Vuba One**
- Website: **https://vuba.one**
- Repository: **https://github.com/vubaone/home.projects.vsx.fastjson**
- Version: **1.0.3**

## Error Handling

If the selected text is not valid JSON (for Format / Minify / Convert To JSON), you'll see a native VS Code error notification with the error message and the approximate line and column where the problem was found.

## Installation

### From Source

```bash
cd home.projects.vsx.fastjson
npm install -g @vscode/vsce   # one-time
vsce package                  # produces fastjson-1.0.3.vsix
code --install-extension fastjson-1.0.3.vsix
```

### Development

```bash
code --extensionDevelopmentPath="/path/to/home.projects.vsx.fastjson"
```
