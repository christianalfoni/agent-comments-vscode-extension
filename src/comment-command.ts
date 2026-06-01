import * as vscode from "vscode";
import { getCommentStyle } from "./comment-utils";
import { escapeRegExp, getKeyword } from "./config";

// ---------------------------------------------------------------------------
// Exported Functions
// ---------------------------------------------------------------------------

export function registerCommentCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("agentComments.toggleComment", () =>
      toggleComment(),
    ),
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Matches an existing keyword comment line for the configured keyword,
// across every comment style we know how to emit.
function buildLineRe(keyword: string): RegExp {
  return new RegExp(
    `^\\s*(?:\\/\\/|#|--|{?\\s*\\/\\*|<!--)\\s*${escapeRegExp(keyword)}:`,
  );
}

function toggleComment(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const keyword = getKeyword();
  const line = editor.document.lineAt(editor.selection.active.line);

  if (buildLineRe(keyword).test(line.text)) {
    // Toggle off — remove the whole keyword comment line.
    editor.edit((builder) => builder.delete(line.rangeIncludingLineBreak));
    return;
  }

  // No keyword comment here — insert one, context-aware.
  const lines = Array.from(
    { length: editor.document.lineCount },
    (_, i) => editor.document.lineAt(i).text,
  );
  const { before, after } = getCommentStyle(
    editor.document.languageId,
    lines,
    editor.selection.active.line,
  );
  const indent = line.text.match(/^(\s*)/)?.[1] ?? "";
  const isEmptyLine = line.text.trim() === "";
  // Replace whitespace-only lines (e.g. auto-indented blank lines) to avoid
  // doubling the indent; otherwise insert a fresh line above the content.
  const insertTarget = isEmptyLine
    ? line.range
    : new vscode.Position(line.lineNumber, 0);
  editor.insertSnippet(
    new vscode.SnippetString(
      `${indent}${before}${keyword}: $0${after}${isEmptyLine ? "" : "\n"}`,
    ),
    insertTarget,
  );
}
