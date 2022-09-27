# vite-electron-plugin

Fast, Electron plugin for Vite

[![NPM version](https://img.shields.io/npm/v/vite-electron-plugin.svg)](https://npmjs.org/package/vite-electron-plugin)
[![NPM Downloads](https://img.shields.io/npm/dm/vite-electron-plugin.svg)](https://npmjs.org/package/vite-electron-plugin)

- 🚀 Fast <sub><sup>(Not Bundle, based on esbuild)</sup></sub>
- 🔥 Hot reload
- 📦 Out of the box
- 🌱 What you see is what you get

## Install

```sh
npm i vite-electron-plugin -D
```

## Examples

- [quick-start](https://github.com/caoxiemeihao/vite-electron-plugin/tree/main/examples/quick-start)
- [custom-start-electron-app](https://github.com/caoxiemeihao/vite-electron-plugin/tree/main/examples/custom-start-electron-app)

## Recommend structure

Let's use the official [template-vanilla-ts](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla-ts) created based on `create vite` as an example

```diff
+ ├─┬ electron
+ │ └── main.ts
  ├─┬ src
  │ ├── main.ts
  │ ├── style.css
  │ └── vite-env.d.ts
  ├── .gitignore
  ├── favicon.svg
  ├── index.html
  ├── package.json
  ├── tsconfig.json
+ └── vite.config.ts
```

- 🚨 *By default, the files in `electron` folder will be built into the `dist-electron`*
- 🚨 *Currently, `"type": "module"` is not supported in Electron*

## Usage

vite.config.ts

```js
import electron from 'vite-electron-plugin'

export default {
  plugins: [
    electron({
      include: [
        // The Electron source codes directory
        'electron',
      ],
    }),
  ],
}
```

electron/main.ts

```js
import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  const win = new BrowserWindow()

  if (app.isPackaged) {
    win.loadFile('your-build-output-index.html')
  } else {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  }
})
```

## API <sub><sup>(Define)</sup></sub>

###### `electron(config: Configuration)`

```ts
export interface Configuration {
  /** @default process.cwd() */
  root?: string
  /** @default ['.ts', '.js', '.json'] */
  extensions?: string[]
  /** Electron-Main, Preload-Scripts */
  include: string[]
  /** @default 'dist-electron' */
  outDir?: string
  /** Options of `esbuild.transform()` */
  transformOptions?: import('esbuild').TransformOptions

  configResolved?: (config: Readonly<ResolvedConfig>) => void | Promise<void>
  /** Triggered by `include` file changes. You can emit some files in this hooks. */
  onwatch?: (envet: 'add' | 'change' | 'addDir' | 'unlink' | 'unlinkDir', path: string) => void
  /** Triggered by changes in `extensions` files in include */
  transform?: (args: {
    filename: string
    code: string
    /** Skip subsequent build steps(esbuild.transform()) */
    done: () => void
  }) => string | void | Promise<string | void>
  /** Disable Electron App auto start */
  startup?: false
}
```

###### ResolvedConfig

```ts
export interface ResolvedConfig {
  config: Configuration
  /** @default process.cwd() */
  root: string
  /** @default ['.ts', '.js', '.json'] */
  extensions: string[]
  /** Relative path */
  include: string[]
  /** Absolute path */
  outDir: string
  /** Options of `esbuild.transform()` */
  transformOptions: import('esbuild').TransformOptions
  /** The value is `null` at build time */
  watcher: import('chokidar').FSWatcher | null
  /** The value is `null` at build time */
  viteDevServer: import('vite').ViteDevServer | null,
  /** From `config.include` */
  include2files: string[]
  /** src/foo.js -> dist/foo.js */
  src2dist: (filename: string) => string
  /** Electron App startup function */
  startup: (args?: string[]) => Promise<void>
  /**
   * Preload-Scripts
   * e.g.
   * - `xxx.preload.js`
   * - `xxx.preload.ts`
   */
  isPreload: (fielname: string) => boolean
}
```
