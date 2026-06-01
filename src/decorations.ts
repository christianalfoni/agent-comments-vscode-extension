import * as vscode from "vscode";
import { affectsKeyword, escapeRegExp, getKeyword } from "./config";

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

export interface Disposable {
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Exported Functions
// ---------------------------------------------------------------------------

function buildKeywordRe(keyword: string): RegExp {
  return new RegExp(
    `(?:\\/\\/|#|--|{?\\s*\\/\\*|<!--)\\s*(${escapeRegExp(keyword)}):`,
    "g",
  );
}

export function startDecorations(context: vscode.ExtensionContext): Disposable {
  const decorationType = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("testing.iconQueued"),
    fontWeight: "bold",
  });
  context.subscriptions.push(decorationType);

  let keywordRe = buildKeywordRe(getKeyword());

  function applyToEditor(editor: vscode.TextEditor) {
    const ranges: vscode.Range[] = [];
    const doc = editor.document;

    for (let i = 0; i < doc.lineCount; i++) {
      const text = doc.lineAt(i).text;
      keywordRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = keywordRe.exec(text)) !== null) {
        const keyword = match[1];
        const keywordStart = match.index + match[0].indexOf(keyword);
        const keywordEnd = keywordStart + keyword.length;
        ranges.push(new vscode.Range(i, keywordStart, i, keywordEnd));
      }
    }

    editor.setDecorations(decorationType, ranges);
  }

  function applyToAllVisible() {
    for (const editor of vscode.window.visibleTextEditors) {
      applyToEditor(editor);
    }
  }

  applyToAllVisible();

  const subs = [
    vscode.window.onDidChangeVisibleTextEditors(applyToAllVisible),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.visibleTextEditors.find(
        (ed) => ed.document.uri.fsPath === e.document.uri.fsPath,
      );
      if (editor) applyToEditor(editor);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (affectsKeyword(e)) {
        keywordRe = buildKeywordRe(getKeyword());
        applyToAllVisible();
      }
    }),
  ];

  return {
    dispose() {
      for (const s of subs) s.dispose();
    },
  };
}
