import * as vscode from "vscode";
import { registerCommentCommand } from "./comment-command";
import { startDecorations } from "./decorations";

export function activate(context: vscode.ExtensionContext) {
  registerCommentCommand(context);

  const decorations = startDecorations(context);
  context.subscriptions.push(decorations);
}

export function deactivate() {}
