# vite-electron-plugin

High-performance, esbuild-based Vite Electron plugin

[![NPM version](https://img.shields.io/npm/v/vite-electron-plugin.svg)](https://npmjs.org/package/vite-electron-plugin)
[![NPM Downloads](https://img.shields.io/npm/dm/vite-electron-plugin.svg)](https://npmjs.org/package/vite-electron-plugin)

- 🚀 High-performance <sub><sup>(Not Bundle, based on esbuild)</sup></sub>
- 🎯 Support Plugin <sub><sup>(Like Vite's plugin)</sup></sub>
- 🌱 What you see is what you get
- 🔥 Hot restart

## Install

```sh
npm i vite-electron-plugin -D
```

## Examples

- [quick-start](https://github.com/electron-vite/vite-electron-plugin/tree/main/examples/quick-start)
- [plugin/alias](https://github.com/electron-vite/vite-electron-plugin/tree/main/examples/alias)
- [plugin/copy](https://github.com/electron-vite/vite-electron-plugin/tree/main/examples/copy)
- [plugin/custom-start-electron-app](https://github.com/electron-vite/vite-electron-plugin/tree/main/examples/custom-start-electron-app)

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
## Conventions

- Any file ending with `reload.ext` *(e.g. `foo.reload.js`, `preload.ts`)* after an update,  
  will trigger a reload of the Electron-Renderer process, instead of an entire Electron App restart.  
  **Which is useful when updating Preload-Scripts.**

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

## Configuration

###### `electron(config: Configuration)`

<table>
  <thead>
    <th>Key</th>
    <th>Type</th>
    <th>Description</th>
    <th>Required</th>
    <th>Default</th>
  </thead>
  <tbody>
    <tr>
      <td>include</td>
      <td><code>Array</code></td>
      <td>
        <code>directory</code> or <code>filename</code> or <code>glob</code> Array.<br/>
        Must be a relative path, which will be calculated based on the <code>root</code>.<br/>
        If it is an absolute path, it can only be a subpath of root.<br/>
        Otherwise it will cause the output file path to be calculated incorrectly.<br/>
      </td>
      <td>✅</td>
      <td></td>
    </tr>
    <tr>
      <td>root</td>
      <td><code>string</code></td>
      <td></td>
      <td></td>
      <td><code>process.cwd()</code></td>
    </tr>
    <tr>
      <td>outDir</td>
      <td><code>string</code></td>
      <td>Output Directory.</td>
      <td></td>
      <td><code>dist-electron</code></td>
    </tr>
    <tr>
      <td>api</td>
      <td><code>Record&lt;string, any&gt;</code></td>
      <td>Useful if you want to pass some payload to the plugin.</td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>plugins</td>
      <td><code>Plugin[]</code></td>
      <td>See the Plugin API.</td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>logger</td>
      <td><code>{ [type: string], (...message: string[]) => void }</code></td>
      <td>Custom log. If <code>logger</code> is passed, all logs will be input this option</td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>transformOptions</td>
      <td><code>import('esbuild').TransformOptions</code></td>
      <td>Options of <code>esbuild.transform()</code></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>watch</td>
      <td><code>import('chokidar').WatchOptions</code></td>
      <td>Options of <code>chokidar.watch()</code></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

## Plugin API

> The design of plugin is similar to [Vite's plugin](https://vitejs.dev/guide/api-plugin.html). But simpler, only 4 hooks in total.

#### `configResolved`

- **Type**: `(config: ResolvedConfig) => void | Promise<void>`
- **Kind**: `async`, `sequential`

You can freely modify the `config` argument in ths hooks or use.

#### `onwatch` <sub><sup>serve only</sup></sub>

- **Type**: `(envet: 'add' | 'change' | 'addDir' | 'unlink' | 'unlinkDir', path: string) => void`
- **Kind**: `async`, `parallel`

Triggered by `include` file changes. You can emit some files in this hooks. Even restart the Electron App.

#### `transform`

- **Type**: `(args: { filename: string, code: string, done: () => void }) => string | import('esbuild').TransformResult | void | Promise<string | import('esbuild').TransformResult | void>`
- **Kind**: `async`, `sequential`

Triggered by changes in `extensions` files in include.

#### `ondone`

- **Type**: `(args: { filename: string, distname: string }) => void`
- **Kind**: `async`, `parallel`

Triggered when `transform()` ends or a file in `extensions` is removed.

## Builtin Plugin

```ts
import path from 'path'
import electron from 'vite-electron-plugin'
import {
  alias,
  copy,
  customStart,
  loadViteEnv,
} from 'vite-electron-plugin/plugin'

export default {
  plugins: [
    electron({
      plugins: [
        alias([
          // `replacement` is recommented to use absolute path, 
          // it will be automatically calculated as relative path.
          { find: '@', replacement: path.join(__dirname, 'src') },
        ]),

        copy([
          // filename, glob
          { from: 'foo/*.ext', to: 'dest' },
        ]),

        customStart(({ startup }) => {
          // If you want to control the launch of Electron App yourself.
          startup()
        }),

        // https://vitejs.dev/guide/env-and-mode.html#env-files
        // Support use `import.meta.env.VITE_SOME_KEY` in Electron-Main
        loadViteEnv(),
      ],
    }),
  ],
}
```

## JavaScript API

```ts
import {
  type Configuration,
  type ResolvedConfig,
  type Plugin,
  build,
  watch,
  startup,
  defineConfig,
  default as electron,
} from 'vite-electron-plugin'
```

**Example**

```js
// dev
watch({
  include: [
    // The Electron source codes directory
    'electron',
  ],
  plugins: [
    {
      name: 'plugin-electron-startup',
      ondone() {
        // Startup Electron App
        startup()
      },
    },
  ],
})

// build
build({
  include: ['electron'],
})
```
