# Changelog

## 0.2.0

- New **Agent Comments** activity-bar panel listing every marker in the workspace, grouped by file with a per-file count and a badge of the total.
- Click a comment to jump straight to its line.
- **Copy All** button writes the comments to the clipboard as a flat `path:line — text` list, ready to paste to Claude / Codex.
- **Clear All** button removes every marker — whole-line for standalone markers, comment-only for markers trailing real code.
- Panel auto-refreshes (debounced) on edit, save, file add/remove, and keyword changes; manual refresh button too.

## 0.1.0

- Initial release.
- Toggle a context-aware comment marker with `cmd+shift+i` / `ctrl+shift+i`.
- Configurable keyword via `agentComments.keyword` (default `CLAUDE`).
- Comment style adapts to the language and to JSX context (`//`, `#`, `{/* */}`, `<!-- -->`, `/* */`, `--`), including JSON and YAML.
- Press again on a marker line to remove it.
- Keyword highlighted in open editors.
- Works in both VS Code Desktop and the web (vscode.dev / github.dev).
