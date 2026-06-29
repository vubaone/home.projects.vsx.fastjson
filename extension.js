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

    // ── Copy Value ──────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.copyValue', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Fast JSON: No active editor.');
                return;
            }

            const document = editor.document;
            const offset = document.offsetAt(editor.selection.active);
            const text = document.getText();

            try {
                const value = getJsonValueAtOffset(text, offset);
                if (value === null || value === undefined) {
                    vscode.window.showInformationMessage('Fast JSON: No JSON value found at cursor position.');
                    return;
                }

                const valueStr = String(value);
                vscode.env.clipboard.writeText(valueStr).then(() => {
                    const displayVal = valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr;
                    vscode.window.showInformationMessage('Copied: ' + displayVal);
                });
            } catch (err) {
                vscode.window.showErrorMessage('Fast JSON Error: ' + err.message);
            }
        })
    );

    // ── Copy Node ───────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.copyNode', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Fast JSON: No active editor.');
                return;
            }

            const document = editor.document;
            const offset = document.offsetAt(editor.selection.active);
            const text = document.getText();

            try {
                const node = getJsonNodeAtOffset(text, offset);
                if (!node) {
                    vscode.window.showInformationMessage('Fast JSON: No JSON node found at cursor position.');
                    return;
                }

                const nodeText = getJsonNodeCopyText(text, node);
                vscode.env.clipboard.writeText(nodeText).then(() => {
                    const label = node.path || 'root';
                    vscode.window.showInformationMessage('Copied node: ' + label);
                });
            } catch (err) {
                vscode.window.showErrorMessage('Fast JSON Error: ' + err.message);
            }
        })
    );

    // ── Cut Node ────────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.cutNode', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Fast JSON: No active editor.');
                return;
            }

            const document = editor.document;
            const offset = document.offsetAt(editor.selection.active);
            const text = document.getText();

            try {
                const node = getJsonNodeAtOffset(text, offset);
                if (!node) {
                    vscode.window.showInformationMessage('Fast JSON: No JSON node found at cursor position.');
                    return;
                }

                const nodeText = getJsonNodeCopyText(text, node);
                const label = node.path || 'root';
                vscode.env.clipboard.writeText(nodeText).then(() => {
                    deleteJsonNode(editor, document, node).then((success) => {
                        if (success) {
                            vscode.window.showInformationMessage('Cut node: ' + label);
                        }
                    });
                });
            } catch (err) {
                vscode.window.showErrorMessage('Fast JSON Error: ' + err.message);
            }
        })
    );

    // ── Delete Node ─────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.deleteNode', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Fast JSON: No active editor.');
                return;
            }

            const document = editor.document;
            const offset = document.offsetAt(editor.selection.active);
            const text = document.getText();

            try {
                const node = getJsonNodeAtOffset(text, offset);
                if (!node) {
                    vscode.window.showInformationMessage('Fast JSON: No JSON node found at cursor position.');
                    return;
                }

                const label = node.path || 'root';
                deleteJsonNode(editor, document, node).then((success) => {
                    if (success) {
                        vscode.window.showInformationMessage('Deleted node: ' + label);
                    }
                });
            } catch (err) {
                vscode.window.showErrorMessage('Fast JSON Error: ' + err.message);
            }
        })
    );

    // ── Node Info ───────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('fastjson.nodeInfo', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('Fast JSON: No active editor.');
                return;
            }

            const document = editor.document;
            const offset = document.offsetAt(editor.selection.active);
            const text = document.getText();

            try {
                const info = getJsonNodeInfoAtOffset(text, offset);
                if (!info) {
                    vscode.window.showInformationMessage('Fast JSON: No JSON node found at cursor position.');
                    return;
                }

                vscode.window.showInformationMessage(formatNodeInfoMessage(info));
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
    // Only switch the document's language mode when the selection covers the
    // entire document.  Otherwise, formatting a JSON snippet embedded in a
    // Markdown, log, or source file would reinterpret the whole file as JSON.
    const coversWholeDocument = text.trim() === editor.document.getText().trim();

    try {
        const result = transform(text);
        editor.edit((editBuilder) => {
            editBuilder.replace(selection, result);
        }).then((success) => {
            // Set the document language for syntax highlighting
            if (success && options && options.setLanguage && coversWholeDocument) {
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

function deleteJsonNode(editor, document, node) {
    const range = new vscode.Range(
        document.positionAt(node.deleteStart),
        document.positionAt(node.deleteEnd)
    );

    return editor.edit((editBuilder) => {
        editBuilder.delete(range);
    });
}

function getJsonNodeCopyText(text, node) {
    if (node.propertyStart !== null && node.propertyStart !== undefined) {
        const propertyText = text.substring(node.propertyStart, node.end);
        return `{\n  ${propertyText}\n}`;
    }

    return text.substring(node.start, node.end);
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

/**
 * Extract the JSON value (or string) at a given character offset.
 */
function getJsonValueAtOffset(text, targetOffset) {
    const regex = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\],:]/g;
    let match;
    let tokens = [];

    while ((match = regex.exec(text)) !== null) {
        tokens.push({
            value: match[0],
            start: match.index,
            end: match.index + match[0].length
        });
    }

    let targetTokenIndex = -1;
    for (let i = 0; i < tokens.length; i++) {
        if (targetOffset >= tokens[i].start && targetOffset <= tokens[i].end) {
            targetTokenIndex = i;
            break;
        }
    }

    if (targetTokenIndex === -1) {
        // Fallback: finding nearest token to the left
        for (let i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i].end <= targetOffset) {
                targetTokenIndex = i;
                break;
            }
        }
    }

    if (targetTokenIndex === -1) return null;

    let tk = tokens[targetTokenIndex];
    let valueTokenIndex = targetTokenIndex;

    if (targetTokenIndex + 1 < tokens.length && tokens[targetTokenIndex + 1].value === ':') {
        valueTokenIndex = targetTokenIndex + 2;
    } else if (tk.value === ':') {
        valueTokenIndex = targetTokenIndex + 1;
    } else if (tk.value === ',' || tk.value === '}' || tk.value === ']') {
        return null;
    }

    if (valueTokenIndex >= tokens.length) return null;

    let valTk = tokens[valueTokenIndex];

    if (valTk.value === '{' || valTk.value === '[') {
        let open = valTk.value;
        let close = open === '{' ? '}' : ']';
        let depth = 0;
        let endIndex = -1;
        for (let i = valueTokenIndex; i < tokens.length; i++) {
            if (tokens[i].value === open) depth++;
            else if (tokens[i].value === close) depth--;

            if (depth === 0) {
                endIndex = i;
                break;
            }
        }
        if (endIndex !== -1) {
            return text.substring(valTk.start, tokens[endIndex].end);
        }
        return null;
    } else {
        let val = valTk.value;
        if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
            try {
                return JSON.parse(val);
            } catch (e) {
                return val.slice(1, -1);
            }
        }
        return val;
    }
}

function tokenizeJson(text) {
    const regex = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\],:]/g;
    const tokens = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        tokens.push({
            value: match[0],
            start: match.index,
            end: match.index + match[0].length
        });
    }

    return tokens;
}

function getJsonNodeAtOffset(text, targetOffset) {
    const tokens = tokenizeJson(text);
    const targetTokenIndex = findTokenIndexAtOffset(tokens, targetOffset);
    if (targetTokenIndex === -1) return null;

    const valueTokenIndex = resolveValueTokenIndex(tokens, targetTokenIndex);
    if (valueTokenIndex === -1 || valueTokenIndex >= tokens.length) return null;

    const endTokenIndex = findNodeEndTokenIndex(tokens, valueTokenIndex);
    if (endTokenIndex === -1) return null;

    const startToken = tokens[valueTokenIndex];
    const endToken = tokens[endTokenIndex];

    return {
        start: startToken.start,
        end: endToken.end,
        ...getJsonNodePropertyRange(tokens, valueTokenIndex),
        ...getJsonNodeDeleteRange(tokens, valueTokenIndex, endTokenIndex),
        path: getJsonNodePath(text, tokens, targetTokenIndex, valueTokenIndex),
        type: getNodeType(startToken.value),
        startTokenIndex: valueTokenIndex,
        endTokenIndex
    };
}

function getJsonNodeInfoAtOffset(text, targetOffset) {
    const node = getJsonNodeAtOffset(text, targetOffset);
    if (!node) return null;

    const tokens = tokenizeJson(text);
    const childCount = countDirectChildren(tokens, node.startTokenIndex, node.endTokenIndex);

    return {
        path: node.path,
        type: node.type,
        childCount
    };
}

function findTokenIndexAtOffset(tokens, targetOffset) {
    for (let i = 0; i < tokens.length; i++) {
        if (targetOffset >= tokens[i].start && targetOffset <= tokens[i].end) {
            return i;
        }
    }

    for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].end <= targetOffset) {
            return i;
        }
    }

    return -1;
}

function resolveValueTokenIndex(tokens, tokenIndex) {
    const token = tokens[tokenIndex].value;

    if (token === ',' || token === ':') {
        return token === ':' ? tokenIndex + 1 : -1;
    }

    if (token === '}' || token === ']') {
        return findMatchingOpenTokenIndex(tokens, tokenIndex);
    }

    if (isStringToken(token) && tokens[tokenIndex + 1] && tokens[tokenIndex + 1].value === ':') {
        return tokenIndex + 2;
    }

    return tokenIndex;
}

function getJsonNodePath(text, tokens, targetTokenIndex, valueTokenIndex) {
    const targetToken = tokens[targetTokenIndex].value;
    const valueToken = tokens[valueTokenIndex].value;

    if (isStringToken(targetToken) && tokens[targetTokenIndex + 1] && tokens[targetTokenIndex + 1].value === ':') {
        return getJsonPathAtOffset(text, tokens[targetTokenIndex].start) || 'root';
    }

    let path = getJsonPathAtOffset(text, tokens[valueTokenIndex].start) || 'root';
    if (valueToken === '[' && path.endsWith('.0')) {
        path = path.substring(0, path.length - 2) || 'root';
    }

    return path;
}

function getJsonNodePropertyRange(tokens, startTokenIndex) {
    const keyTokenIndex = getPropertyKeyTokenIndex(tokens, startTokenIndex);
    if (keyTokenIndex === -1) {
        return {
            propertyStart: null
        };
    }

    return {
        propertyStart: tokens[keyTokenIndex].start
    };
}

function getJsonNodeDeleteRange(tokens, startTokenIndex, endTokenIndex) {
    const keyTokenIndex = getPropertyKeyTokenIndex(tokens, startTokenIndex);
    const deleteStartTokenIndex = keyTokenIndex !== -1 ? keyTokenIndex : startTokenIndex;
    const previousToken = tokens[deleteStartTokenIndex - 1];
    const nextToken = tokens[endTokenIndex + 1];

    if (previousToken && previousToken.value === ',') {
        return {
            deleteStart: previousToken.start,
            deleteEnd: tokens[endTokenIndex].end
        };
    }

    if (nextToken && nextToken.value === ',') {
        return {
            deleteStart: tokens[deleteStartTokenIndex].start,
            deleteEnd: nextToken.end
        };
    }

    return {
        deleteStart: tokens[deleteStartTokenIndex].start,
        deleteEnd: tokens[endTokenIndex].end
    };
}

function getPropertyKeyTokenIndex(tokens, valueTokenIndex) {
    const colonToken = tokens[valueTokenIndex - 1];
    const keyToken = tokens[valueTokenIndex - 2];

    if (colonToken && colonToken.value === ':' && keyToken && isStringToken(keyToken.value)) {
        return valueTokenIndex - 2;
    }

    return -1;
}

function findNodeEndTokenIndex(tokens, startTokenIndex) {
    const token = tokens[startTokenIndex].value;
    if (token !== '{' && token !== '[') return startTokenIndex;

    let depth = 0;
    for (let i = startTokenIndex; i < tokens.length; i++) {
        const value = tokens[i].value;
        if (value === '{' || value === '[') {
            depth++;
        } else if (value === '}' || value === ']') {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function findMatchingOpenTokenIndex(tokens, closeTokenIndex) {
    let depth = 0;
    for (let i = closeTokenIndex; i >= 0; i--) {
        const value = tokens[i].value;
        if (value === '}' || value === ']') {
            depth++;
        } else if (value === '{' || value === '[') {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function countDirectChildren(tokens, startTokenIndex, endTokenIndex) {
    const token = tokens[startTokenIndex].value;
    if (token !== '{' && token !== '[') return 0;
    if (endTokenIndex <= startTokenIndex + 1) return 0;

    return token === '{'
        ? countObjectProperties(tokens, startTokenIndex, endTokenIndex)
        : countArrayItems(tokens, startTokenIndex, endTokenIndex);
}

function countObjectProperties(tokens, startTokenIndex, endTokenIndex) {
    let depth = 0;
    let count = 0;

    for (let i = startTokenIndex + 1; i < endTokenIndex; i++) {
        const value = tokens[i].value;

        if (value === '{' || value === '[') {
            depth++;
        } else if (value === '}' || value === ']') {
            depth--;
        } else if (depth === 0 && isStringToken(value) && tokens[i + 1] && tokens[i + 1].value === ':') {
            count++;
        }
    }

    return count;
}

function countArrayItems(tokens, startTokenIndex, endTokenIndex) {
    let depth = 0;
    let count = 0;
    let expectingValue = true;

    for (let i = startTokenIndex + 1; i < endTokenIndex; i++) {
        const value = tokens[i].value;

        if (depth === 0 && expectingValue && value !== ',') {
            count++;
            expectingValue = false;
        }

        if (value === '{' || value === '[') {
            depth++;
        } else if (value === '}' || value === ']') {
            depth--;
        } else if (depth === 0 && value === ',') {
            expectingValue = true;
        }
    }

    return count;
}

function getNodeType(token) {
    if (token === '{') return 'object';
    if (token === '[') return 'array';
    if (isStringToken(token)) return 'string';
    if (token === 'true' || token === 'false') return 'boolean';
    if (token === 'null') return 'null';
    return 'number';
}

function isStringToken(token) {
    return token.startsWith('"');
}

function formatNodeInfoMessage(info) {
    const label = info.path || 'root';

    if (info.type === 'object') {
        return `Node ${label} has ${info.childCount} ${pluralize(info.childCount, 'property', 'properties')}.`;
    }

    if (info.type === 'array') {
        return `Node ${label} has ${info.childCount} ${pluralize(info.childCount, 'item', 'items')}.`;
    }

    return `Node ${label} is a ${info.type} value.`;
}

function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    _internals: {
        getJsonNodeAtOffset,
        getJsonNodeInfoAtOffset,
        getJsonNodeCopyText,
        getJsonNodeDeleteRange,
        formatNodeInfoMessage
    }
};
