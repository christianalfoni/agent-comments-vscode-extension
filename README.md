# Agent Comments

Insert a single, context-aware comment marker for your coding agent to pick up — press a key, type your intent, and let the agent find it.

```ts
function calculateTotal(items: Item[]) {
  // CLAUDE: add a discount parameter and apply it here
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

## What it does

Pressing the keybinding inserts a comment marker on a new line above the cursor (or replaces the current blank line). The marker keyword is configurable and the **comment syntax adapts to where you are**:

- `// CLAUDE:` in JavaScript / TypeScript / JSON
- `# CLAUDE:` in Python, YAML, shell, TOML, Ruby
- `{/* CLAUDE: */}` when the cursor sits **inside JSX children** (and `//` when it doesn't, even in the same `.tsx` file)
- `<!-- CLAUDE: -->` in HTML / XML / Markdown
- `/* CLAUDE: */` in CSS / SCSS / LESS
- `-- CLAUDE:` in SQL / Lua / Haskell

The JSX detection scans backwards from the cursor, counts unclosed tags, stops at statement boundaries, and ignores TypeScript generics like `Array<string>` — so you get `{/* */}` only when a comment there is actually valid.

Press the keybinding again on a marker line to **toggle it off** (remove it).

The keyword is highlighted in open editors so your pending markers are easy to spot.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `agentComments.keyword` | `CLAUDE` | The keyword inserted as the marker. Set it to `CODEX`, `TODO`, or anything your agent looks for. |

## Keybinding

| Command | Mac | Windows / Linux |
| --- | --- | --- |
| Agent Comments: Toggle comment marker | `cmd+shift+i` | `ctrl+shift+i` |

Active only when the editor has text focus. Rebind it via **Preferences: Open Keyboard Shortcuts** if it clashes with your setup.

## Development

```bash
npm install
npm run build      # bundle to out/extension.js
npm run watch      # rebuild on change
npm test           # run the comment-style / JSX-context unit tests
npm run package    # produce a .vsix
```

Press `F5` in VS Code to launch an Extension Development Host.
