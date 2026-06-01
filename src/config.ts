import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

export const CONFIG_SECTION = "agentComments";
export const KEYWORD_SETTING = "keyword";
export const DEFAULT_KEYWORD = "CLAUDE";

/** The configured keyword to insert (e.g. CLAUDE, CODEX). Falls back to the default. */
export function getKeyword(): string {
  const value = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<string>(KEYWORD_SETTING, DEFAULT_KEYWORD);
  return value.trim() || DEFAULT_KEYWORD;
}

/** Escape a string for safe interpolation into a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when a configuration change touched the keyword setting. */
export function affectsKeyword(e: vscode.ConfigurationChangeEvent): boolean {
  return e.affectsConfiguration(`${CONFIG_SECTION}.${KEYWORD_SETTING}`);
}
