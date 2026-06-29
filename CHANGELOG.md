# Changelog

## 1.1.0 - 2026-06-29

- Added **Copy Node** to copy the complete JSON node at the cursor.
- Updated **Copy Node** to include object property keys and wrap them in `{}`.
- Added **Cut Node** to copy and remove the complete JSON node at the cursor.
- Added **Delete Node** to remove the complete JSON node at the cursor.
- Added **Node Info** to show object property counts, array item counts, or scalar value types.
- Added explicit command activation events for VS Code 1.70 compatibility.
- Updated README command coverage and package metadata for Marketplace publishing.

## 1.0.3 - 2026-06-18

- Added **Copy Value** to copy the JSON value at the cursor.

## 1.0.2 - 2026-03-23

- Updated publisher metadata from `vuba` to `vubaone`
- Added official website, repository, bug tracker, and author metadata
- Updated README branding and project links
- Switched README logo to an absolute GitHub URL so it renders correctly on Open VSX
- Clarified installation examples for the `vubaone.fastjson` package

## 1.0.0 — 2026-03-19

- Initial release
- **Format / Beautify** — pretty-print selected JSON
- **Minify / Compact** — collapse selected JSON to one line
- **Convert To Text** — escape JSON into a string literal
- **Convert To JSON** — unescape a string literal back to JSON
- Error notifications with line & column information
