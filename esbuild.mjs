import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const desktopOpts = {
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
};

// Web build: runs in the VS Code web-extension host (a Web Worker) for
// vscode.dev / github.dev. The source uses no Node APIs, so the only
// difference is the browser platform target.
/** @type {import('esbuild').BuildOptions} */
const webOpts = {
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  outfile: "out/web/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "browser",
  sourcemap: true,
};

if (watch) {
  const [desktopCtx, webCtx] = await Promise.all([
    esbuild.context(desktopOpts),
    esbuild.context(webOpts),
  ]);
  await Promise.all([desktopCtx.watch(), webCtx.watch()]);
  process.stdout.write("Watching extension (desktop + web)...\n");
} else {
  await Promise.all([esbuild.build(desktopOpts), esbuild.build(webOpts)]);
}
