# Changelog

## 0.1.0

- Initial release.
- Toggle a context-aware comment marker with `cmd+shift+i` / `ctrl+shift+i`.
- Configurable keyword via `agentComments.keyword` (default `CLAUDE`).
- Comment style adapts to the language and to JSX context (`//`, `#`, `{/* */}`, `<!-- -->`, `/* */`, `--`), including JSON and YAML.
- Press again on a marker line to remove it.
- Keyword highlighted in open editors.
- Works in both VS Code Desktop and the web (vscode.dev / github.dev).
