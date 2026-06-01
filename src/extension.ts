import * as vscode from "vscode";
import { registerCommentCommand } from "./comment-command";
import { startDecorations } from "./decorations";
import { registerCommentsView } from "./comments-view";

export function activate(context: vscode.ExtensionContext) {
  registerCommentCommand(context);

  const decorations = startDecorations(context);
  context.subscriptions.push(decorations);

  context.subscriptions.push(registerCommentsView(context));
}

export function deactivate() {}
