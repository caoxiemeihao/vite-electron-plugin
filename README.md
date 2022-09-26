# vite-electron-plugin

Fast, Electron plugin for Vite

[![NPM version](https://img.shields.io/npm/v/vite-electron-plugin.svg)](https://npmjs.org/package/vite-electron-plugin)
[![NPM Downloads](https://img.shields.io/npm/dm/vite-electron-plugin.svg)](https://npmjs.org/package/vite-electron-plugin)

- 🚀 Fast <sub><sup>(based on esbuild)</sup></sub>
- 🔥 Hot reload
- 📦 Out of the box
- 🌱 What you see is what you get

## Install

```sh
npm i vite-electron-plugin -D
```

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

🚨 *By default, the files in `electron` folder will be built into the `dist-electron`*

## Usage

> 👉 [vite-electron-plugin/examples](https://github.com/caoxiemeihao/vite-electron-plugin/tree/main/examples)

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

You can use `process.env.VITE_DEV_SERVER_URL` when the Vite command is called 'serve'

```js
// electron/main.ts
const win = new BrowserWindow({
  title: 'Main window',
})

if (process.env.VITE_DEV_SERVER_URL) {
  win.loadURL(process.env.VITE_DEV_SERVER_URL)
} else {
  // load your file
  win.loadFile('yourOutputFile.html');
}
```

## API

`electron(config: Configuration)`

```ts
export interface Configuration {
  /** @default process.cwd() */
  root?: string
  /** Electron-Main, Preload-Scripts */
  include: string[]
  /** @default 'dist-electron' */
  outDir?: string
  /** Options of `esbuild.transform()` */
  transformOptions?: import('esbuild').TransformOptions

  configResolved?: (config: Readonly<ResolvedConfig>) => void | Promise<void>
  /** Triggered by `include` file changes. You can emit some files in this hooks. */
  onwatch?: (envet: 'add' | 'change' | 'addDir' | 'unlink' | 'unlinkDir', path: string) => void
  /** Triggered by changes in .ts, .js, .json files in include */
  transform?: (args: {
    /** .ts, .js, .json */
    filename: string
    code: string
    /** Stop subsequent build steps */
    stop: () => void
  }) => string | void | Promise<string | void>
  /** Custom Electron App startup */
  onstart?: (args: {
    filename: | string
    event: Parameters<Required<Configuration>['onwatch']>[0]
    /** Electron App startup function */
    startup: () => Promise<void>
    viteDevServer: import('vite').ViteDevServer
  }) => void
}
```
