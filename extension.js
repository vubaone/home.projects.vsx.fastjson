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
                // Parse and minify first, then escape to text
                const obj = JSON.parse(text);
                const minified = JSON.stringify(obj);
                return JSON.stringify(minified);
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
                let unescaped;
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    unescaped = JSON.parse(trimmed);
                } else {
                    unescaped = JSON.parse('"' + text + '"');
                }
                // Parse the unescaped string as a JSON object and beautify
                const obj = JSON.parse(unescaped);
                return JSON.stringify(obj, null, 2);
            }, { setLanguage: 'json' });
        })
    );

    // ── Copy Flat Key ───────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.copyFlatKey', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Fast JSON: No active editor.');
                return;
            }

            const document = editor.document;
            const offset = document.offsetAt(editor.selection.active);
            const text = document.getText();
            
            try {
                const flatKey = getJsonPathAtOffset(text, offset);
                if (!flatKey) {
                    vscode.window.showInformationMessage('Fast JSON: No JSON key found at cursor position.');
                    return;
                }
                
                vscode.env.clipboard.writeText(flatKey).then(() => {
                    vscode.window.showInformationMessage('Copied: ' + flatKey);
                });
            } catch (err) {
                vscode.window.showErrorMessage('Fast JSON Error: ' + err.message);
            }
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

/**
 * Simple JSON path logic that builds a dot-separated string
 * of keys up to the target offset.
 */
function getJsonPathAtOffset(text, targetOffset) {
    const stack = [];
    let lastString = null;
    let currentKey = null;

    const regex = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\],:]/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        const tk = match[0];
        const tokenEnd = match.index + tk.length;
        
        const pathKey = currentKey !== null ? currentKey : (stack.length > 0 && stack[stack.length - 1].type === 'array' ? stack[stack.length - 1].currentIndex : null);

        if (tk === '{' || tk === '[') {
            stack.push({
                type: tk === '{' ? 'object' : 'array',
                key: pathKey,
                currentIndex: 0
            });
            currentKey = null;
            lastString = null;
        } else if (tk === '}' || tk === ']') {
            if (tokenEnd >= targetOffset) break;
            stack.pop();
            currentKey = null;
            lastString = null;
        } else if (tk === ':') {
            currentKey = lastString;
            lastString = null;
        } else if (tk === ',') {
            if (stack.length > 0 && stack[stack.length - 1].type === 'array') {
                stack[stack.length - 1].currentIndex++;
            }
            currentKey = null;
            lastString = null;
        } else if (tk.startsWith('"')) {
            try { lastString = JSON.parse(tk); } catch (e) { lastString = null; }
        } else {
            lastString = null;
        }
        
        if (tokenEnd >= targetOffset) {
            break;
        }
    }
    
    const pathSegments = stack.map(s => s.key).filter(k => k !== null);
    
    if (stack.length > 0 && stack[stack.length - 1].type === 'object') {
        if (currentKey !== null) {
            pathSegments.push(currentKey);
        } else if (lastString !== null) {
            pathSegments.push(lastString);
        }
    } else if (stack.length > 0 && stack[stack.length - 1].type === 'array') {
        pathSegments.push(stack[stack.length - 1].currentIndex);
    }
    
    return pathSegments.join('.');
}

function deactivate() {}

module.exports = { activate, deactivate };
