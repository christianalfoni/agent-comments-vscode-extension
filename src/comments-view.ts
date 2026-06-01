import * as vscode from "vscode";
import { affectsKeyword } from "./config";
import {
  CommentEntry,
  createMarkerLocator,
  formatCommentsForClipboard,
  scanComments,
} from "./comment-scan";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const VIEW_ID = "agentComments.commentsView";

// ---------------------------------------------------------------------------
// Tree node
// ---------------------------------------------------------------------------

// A file grouping node, or a single comment leaf node.
type Node =
  | { kind: "file"; rel: string; uri: vscode.Uri; children: CommentEntry[] }
  | { kind: "comment"; entry: CommentEntry };

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

class CommentsProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private files: Extract<Node, { kind: "file" }>[] = [];
  private total = 0;

  /** Re-scan the workspace and refresh the tree. */
  async refresh(): Promise<void> {
    const entries = await scanComments();
    this.total = entries.length;

    const byUri = new Map<string, Extract<Node, { kind: "file" }>>();
    for (const entry of entries) {
      const key = entry.uri.toString();
      let group = byUri.get(key);
      if (!group) {
        group = {
          kind: "file",
          rel: vscode.workspace.asRelativePath(entry.uri, false),
          uri: entry.uri,
          children: [],
        };
        byUri.set(key, group);
      }
      group.children.push(entry);
    }
    this.files = [...byUri.values()];

    this._onDidChangeTreeData.fire();
  }

  /** Snapshot of all comments currently shown, in tree order. */
  allEntries(): CommentEntry[] {
    return this.files.flatMap((f) => f.children);
  }

  get count(): number {
    return this.total;
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === "file") {
      const item = new vscode.TreeItem(
        node.rel,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      item.resourceUri = node.uri;
      item.iconPath = vscode.ThemeIcon.File;
      item.description = `${node.children.length}`;
      item.contextValue = "agentCommentsFile";
      return item;
    }

    const { entry } = node;
    const item = new vscode.TreeItem(
      entry.text || "(empty)",
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = `L${entry.line + 1}`;
    item.tooltip = `${vscode.workspace.asRelativePath(entry.uri, false)}:${
      entry.line + 1
    }`;
    item.iconPath = new vscode.ThemeIcon("comment");
    item.contextValue = "agentCommentsItem";
    item.command = {
      command: "agentComments.openComment",
      title: "Open Comment",
      arguments: [entry.uri, entry.line],
    };
    return item;
  }

  getChildren(node?: Node): Node[] {
    if (!node) return this.files;
    if (node.kind === "file") {
      return node.children.map((entry) => ({ kind: "comment", entry }));
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Exported Functions
// ---------------------------------------------------------------------------

export function registerCommentsView(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  const provider = new CommentsProvider();
  const view = vscode.window.createTreeView(VIEW_ID, {
    treeDataProvider: provider,
  });

  const updateBadge = () => {
    view.badge =
      provider.count > 0
        ? { value: provider.count, tooltip: `${provider.count} agent comments` }
        : undefined;
  };

  const refresh = async () => {
    await provider.refresh();
    updateBadge();
  };

  // Debounce edit-driven refreshes so typing doesn't trigger a scan per keystroke.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refreshSoon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, 400);
  };

  const subs: vscode.Disposable[] = [
    view,
    vscode.commands.registerCommand("agentComments.refresh", refresh),
    vscode.commands.registerCommand("agentComments.copyAll", async () => {
      const entries = provider.allEntries();
      if (entries.length === 0) {
        vscode.window.showInformationMessage("No agent comments found.");
        return;
      }
      await vscode.env.clipboard.writeText(formatCommentsForClipboard(entries));
      vscode.window.showInformationMessage(
        `Copied ${entries.length} agent comment${
          entries.length === 1 ? "" : "s"
        } to the clipboard.`,
      );
    }),
    vscode.commands.registerCommand("agentComments.clearAll", async () => {
      const entries = provider.allEntries();
      if (entries.length === 0) {
        vscode.window.showInformationMessage("No agent comments to clear.");
        return;
      }
      const uris = [
        ...new Map(entries.map((e) => [e.uri.toString(), e.uri])).values(),
      ];
      const plural = entries.length === 1 ? "" : "s";

      const locate = createMarkerLocator();
      const edit = new vscode.WorkspaceEdit();
      const docs: vscode.TextDocument[] = [];
      for (const uri of uris) {
        const doc = await vscode.workspace.openTextDocument(uri);
        docs.push(doc);
        for (let i = 0; i < doc.lineCount; i++) {
          const line = doc.lineAt(i);
          const col = locate(line.text);
          if (col < 0) continue;
          // Whitespace-only before the marker → it's a standalone line; remove
          // the whole line. Otherwise it trails real code, so strip only the
          // trailing comment (and the spaces leading up to it).
          const codeEnd = line.text.slice(0, col).trimEnd().length;
          edit.delete(
            uri,
            codeEnd === 0
              ? line.rangeIncludingLineBreak
              : new vscode.Range(i, codeEnd, i, line.text.length),
          );
        }
      }
      await vscode.workspace.applyEdit(edit);
      await Promise.all(docs.map((d) => d.save()));
      await refresh();
      vscode.window.showInformationMessage(
        `Removed ${entries.length} agent comment${plural}.`,
      );
    }),
    vscode.commands.registerCommand(
      "agentComments.openComment",
      async (uri: vscode.Uri, line: number) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter,
        );
      },
    ),
    vscode.workspace.onDidSaveTextDocument(refreshSoon),
    vscode.workspace.onDidChangeTextDocument(refreshSoon),
    vscode.workspace.onDidCreateFiles(refreshSoon),
    vscode.workspace.onDidDeleteFiles(refreshSoon),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (affectsKeyword(e)) refresh();
    }),
  ];

  void refresh();

  return {
    dispose() {
      if (timer) clearTimeout(timer);
      for (const s of subs) s.dispose();
    },
  };
}
