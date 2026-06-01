import * as vscode from "vscode";
import { escapeRegExp, getKeyword } from "./config";

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

export interface CommentEntry {
  /** The file containing the comment. */
  uri: vscode.Uri;
  /** Zero-based line index. */
  line: number;
  /** The comment text after the `KEYWORD:` marker, with comment closers stripped. */
  text: string;
}

// ---------------------------------------------------------------------------
// Exported Functions
// ---------------------------------------------------------------------------

// Directories that never contain hand-written agent comments worth listing.
const EXCLUDE_GLOB =
  "**/{node_modules,.git,dist,out,build,.next,.turbo,coverage,.vscode-test}/**";

// Cap how many files we read so a huge workspace can't lock up the host.
const MAX_FILES = 5000;

/**
 * Scans every text file in the workspace for the configured keyword comment
 * marker and returns the matches in file/line order.
 *
 * Uses only the cross-platform `vscode.workspace` filesystem API so it works in
 * both the desktop (Node) and web extension hosts.
 */
export async function scanComments(): Promise<CommentEntry[]> {
  const keyword = getKeyword();
  const lineRe = buildContentRe(keyword);

  const files = await vscode.workspace.findFiles(
    "**/*",
    EXCLUDE_GLOB,
    MAX_FILES,
  );

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const entries: CommentEntry[] = [];

  for (const uri of files) {
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      continue; // unreadable / deleted between listing and reading
    }
    // Skip binary-looking files: a NUL byte in the first chunk is a good signal.
    if (bytes.subarray(0, 8000).includes(0)) continue;

    const lines = decoder.decode(bytes).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const text = extractComment(lines[i], lineRe);
      if (text !== null) entries.push({ uri, line: i, text });
    }
  }

  return entries;
}

/**
 * Returns a predicate that locates the configured keyword marker within a line.
 * It yields the column where the comment opener (`//`, `#`, `<!--`, …) begins, or
 * -1 when the line has no marker — letting callers tell a standalone marker line
 * (only whitespace before it) from an inline one trailing real code.
 */
export function createMarkerLocator(): (lineText: string) => number {
  const re = buildContentRe(getKeyword());
  return (lineText: string) => {
    const match = re.exec(lineText);
    return match ? match.index : -1;
  };
}

/**
 * Builds the clipboard payload for the given comments — one `path:line — text`
 * entry per comment. The `path:line` form is the convention agents already parse
 * from grep output and stack traces, so it's unambiguously a file location.
 */
export function formatCommentsForClipboard(entries: CommentEntry[]): string {
  return entries
    .map((e) => {
      const rel = vscode.workspace.asRelativePath(e.uri, false);
      return `${rel}:${e.line + 1} — ${e.text}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Captures the comment text following `KEYWORD:` across every comment style we
// emit. Mirrors the opener set used by the editor decorations.
function buildContentRe(keyword: string): RegExp {
  return new RegExp(
    `(?:\\/\\/|#|--|{?\\s*\\/\\*|<!--)\\s*${escapeRegExp(keyword)}:\\s?(.*)$`,
  );
}

// Returns the cleaned comment text for a line, or null when it isn't a marker.
function extractComment(lineText: string, re: RegExp): string | null {
  const match = re.exec(lineText);
  if (!match) return null;
  // Strip trailing block/JSX/HTML comment closers and surrounding whitespace.
  return match[1].replace(/\s*(?:\*\/|-->|}|\*\/})\s*$/, "").trim();
}
