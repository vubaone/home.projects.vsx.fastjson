const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    // ── Format / Beautify ───────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.format', () => {
            processSelection((text) => {
                const obj = JSON.parse(text);
                return JSON.stringify(obj, null, 2);
            }, { setLanguage: 'json' });
        })
    );

    // ── Minify / Compact ────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.minify', () => {
            processSelection((text) => {
                const obj = JSON.parse(text);
                return JSON.stringify(obj);
            }, { setLanguage: 'json' });
        })
    );

    // ── Convert To Text ─────────────────────────────────────────────────
    // Escapes the selected text so it becomes a complete JSON string literal
    // with surrounding double-quotes.
    // e.g.  {"a":1}  →  "{\"a\":1}"
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.toText', () => {
            processSelection((text) => {
                // JSON.stringify produces a quoted, escaped string — exactly
                // what we want: "...escaped content..."
                return JSON.stringify(text);
            });
        })
    );

    // ── Convert To JSON ─────────────────────────────────────────────────
    // Reverses "Convert To Text": unescapes a JSON string literal back to
    // raw JSON / text.
    // Handles both forms:
    //   "...escaped..."   →  parse directly (already a valid JSON string)
    //   ...escaped...     →  wrap in quotes first, then parse
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.toJson', () => {
            processSelection((text) => {
                const trimmed = text.trim();
                // If the text is already wrapped in double-quotes, try parsing
                // it directly as a JSON string literal.
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    return JSON.parse(trimmed);
                }
                // Otherwise, wrap it so JSON.parse can interpret the escapes.
                return JSON.parse('"' + text + '"');
            });
        })
    );
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Grab the active selection, run `transform` on the text, and replace it
 * in-place.  Shows an error notification on failure.
 *
 * @param {(text: string) => string} transform
 * @param {{ setLanguage?: string }} [options]
 */
function processSelection(transform, options) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('Fast JSON: No active editor.');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Fast JSON: Please select some text first.');
        return;
    }

    const text = editor.document.getText(selection);

    try {
        const result = transform(text);
        editor.edit((editBuilder) => {
            editBuilder.replace(selection, result);
        }).then((success) => {
            // Set the document language for syntax highlighting
            if (success && options && options.setLanguage) {
                vscode.languages.setTextDocumentLanguage(
                    editor.document, options.setLanguage
                );
            }
        });
    } catch (err) {
        // Build a user-friendly error message with position information
        const message = buildErrorMessage(err, text);
        vscode.window.showErrorMessage(message);
    }
}

/**
 * Build a descriptive error message.  For JSON parse errors we try to
 * extract the position / column so the user knows where the problem is.
 *
 * @param {Error} err
 * @param {string} text
 * @returns {string}
 */
function buildErrorMessage(err, text) {
    const base = err.message || String(err);

    // V8 SyntaxError messages typically look like:
    //   "Unexpected token } in JSON at position 42"
    //   "Expected ',' or ']' after array element in JSON at position 10"
    const posMatch = base.match(/position\s+(\d+)/i);
    if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const { line, column } = offsetToLineCol(text, pos);
        return `Fast JSON Error: ${base} (line ${line}, column ${column})`;
    }

    return `Fast JSON Error: ${base}`;
}

/**
 * Convert a character offset into 1-based line and column numbers.
 *
 * @param {string} text
 * @param {number} offset
 * @returns {{ line: number, column: number }}
 */
function offsetToLineCol(text, offset) {
    let line = 1;
    let lastNewline = -1;
    for (let i = 0; i < offset && i < text.length; i++) {
        if (text[i] === '\n') {
            line++;
            lastNewline = i;
        }
    }
    return { line, column: offset - lastNewline };
}

function deactivate() {}

module.exports = { activate, deactivate };
