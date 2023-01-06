## 0.7.3 (2023-01-06)

- 5a4c8db fix: acorn.parse use `ecmaVersion: 2022`

## 0.7.2 (2023-01-01)

- f80b98a chore: update examples/esmodule
- 201547c feat(plugin/alias): support dynamic `import()`
- b1a33c6 chore: cleanup, use `vite-plugin-utils`
- a78371b chore(deps): add `acorn`, `vite-plugin-utils`

## 0.7.1 (2022-12-30)

- ed4993c fix: include types

## 0.7.0 (2022-12-30)

#### Features

Support use ESM npm-package in Electron-Main.

```ts
import { esmodule } from 'vite-electron-plugin/plugin'
```

👉 [example](https://github.com/electron-vite/vite-electron-plugin/tree/main/examples/esmodule)

- 1879a2e feat: examples/esmodule
- c47bc38 feat: support ESM npm-package | electron-vite-react#98
- 8441b06 refactor: cleanup plugin -> src-plugin

## 0.6.4 (2022-12-27)

- 7071a1c fix: bump notbundle to 0.3.3 #44

## 0.6.3 (2022-12-27)

- 4d008ff fix: correct `transformOptions`

## 0.6.2 (2022-12-26)

- 9ce7a2e chore: bump notbundle to 0.3.2
- 7eba408 feat: add test 🌱
- f6dea8f chore: remove console.log
- 0d5b382 refactor: cleanup

## 0.6.1 (2022-12-25)

- 55e4c75 chore: bump vite to 4.0.3
- befb032 feat: bump notbundle to 0.3.1, `esbuildPlugin`
- 4617849 feat: startup

## 0.6.0 (2022-12-23)

#### Features

**JavaScript API**

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

Example:

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

#### Commit

- ffe8e8b refactor: based notbundle
- 79d8dee chore: bump deps
- e36d86e refactor: better build
- 97e53fa refactor!: use `notbundle`, export JavaScript API 🌱

## 0.5.2 (2022-11-20)

- b0a21c1 refactor(build): better scripts
- 0d689fe Merge pull request #38 from thepiper/main

## 0.5.1 (2022-11-07)

- 11223b0 v0.5.1
- 963c283 feat(#33): generate types
- 4dcccee feat: polyfill `import.meta.env`
- 1fb98b4 feat: reuse sourcemap 🌱

## 0.5.0 (2022-10-31)

- c53008c fix(#26): normalizePath
- 9a243ff v0.5.0
- 6806356 docs: v0.5.0
- 05bd414 chore: cleanup
- d0c67a5 refactor(plugin): `process.env.XXX` -> `import.meta.env.XXX`
- 7666a05 chore(deps): bump vite to 3.2.1
- f82007a feat(examples): quick-start v0.5.0
- f5ff091 chore: backup
- 75eb4b5 chore: `"target": "ES2022"`
- ca726f5 feat(plugin): `loadViteEnv()`
- fa86b10 feat: add `ResolvedConfig['viteResolvedConfig']`

## 0.4.7 (2022-10-28)

- db5e1a7 v0.4.7
- 554d772 (main) chore: cleanup
- f67afd8 chore: update types
- 6dbf474 chore: implements `normalizePath()`
- 36485b5 chore: `node:` prefix
- 78f64f3 (github/main) Merge pull request #20 from keyiis/main
- f103920 Resolve path resolution errors in Windows environment
- 5dd82a3 docs: update
- ac398e2 chore: update comments

## 0.4.6 (2022-10-10)

- df59e2a v0.4.6
- bdda85a fix(🐞): electron-vite-react/issues/72

## 0.4.5 (2022-10-10)

- 030906f v0.4.5
- 07714bc docs: v0.4.5
- 2e24e98 chore(examples): update usage case
- a54f44a chore: bump vite to 3.2.0-beta.0
- 774d226 chore: cleanup
- 909116b feat: `reload()` 🌱

## 0.4.4 (2022-10-06)

- 6ba1147 v0.4.4
- 76487a3 fix(#12): Windows path 🐞

## 0.4.3 (2022-10-05)

- 895d4e6 v0.4.3
- ae21cd9 fix(#10): `index.js` -> `index.mjs`, `index.cjs` -> `index.js`
- dc41b53 chore(examples): bump dependencies
- 5fd7797 chore(examples): add typescript

## 0.4.2 (2022-10-04)

- 2a34af1 v0.4.2
- 32bf379 (main) chore: rename
- bcf26f2 chore(🤔): remove `ensureDir.cache`
- 5af7dc1 fix(examples): correct reference types path

## 0.4.1 (2022-10-03)

- 4e43983 v0.4.1
- 736c66d chore: log info
- 1c5668d chore(utils): add `colours.gary`
- b3712ae fix(plugin): API incorrect

## 0.4.0 (2022-10-02)

- 471f71b v0.4.0
- 84ee5b3 fix(plugin): correct copy path
- b4b03a9 chore: use `logger`
- f43fbbb choer: ignore warning
- c78f604 feat: support sourcemap
- 599a6b7 feat: `logger`
- 0ee1ec9 feat: ensureDir.cache

## 0.3.3 (2022-10-01)

- 5d76ce1 v0.3.3
- 8d659a7 docs: v0.3.3
- a2c50e8 feat: examples/copy
- 3c8c9b5 feat(plugin): copy 🌱
- 2c1906d chore: optimize
- 4abefa2 feat: `colours.green`
- 4ee34d4 docs: update

## 0.3.2 (2022-09-30)

- b7dc155 `index.js` -> `index.cjs`, `index.mjs` -> `index.js`
- 20f32a1 upate
- e0fc882 add plugin/index.js
- a244e52 chore:  U transform ReturnType
- 1501c5d chore(plugin): comments
- cc326f2 feat: examples/alias
- 7a00f7b feat(plugin): alias 🌱
- 1423687 fix(🐞): exclude `.d.ts`
- 5d1fef1 chore: optimize
- 3a737e9 ignore `plugin/index.js`

## 0.3.1 (2022-09-29)

- e6615ec v0.3.1
- d6759a3 docs: v0.3.1
- d783812 chore: update deps
- 4003da5 chore: update custom-start-electron-app
- 00d9cd0 refactor(plugin): better `customStart()`
- 345dc90 fix(🐞): `ondone` not work
- d715d0c chore(plugin): optimize
- 9d4925a docs: update

## 0.3.0 (2022-09-28)

- f2a9600 v0.3.0
- 62496b4 docs: v0.3.0
- f160da6 refactor: custom start APP with v0.3.0
- f23a007 feat: build plugin
- 2a14f4c update
- 76733a0 feat(plugin): `customStart()`
- 1b9477b feat(🌱): support plugin

## 0.2.1 (2022-09-27)

- 51a7027 v0.2.1
- b5e30c8 docs: v0.2.1
- 9ff0305 refactor:  transform `args.stop()` -> `args.done()`
- 9ba3d8e fix(🐞): use `normalizePath()`

## 0.2.0 (2022-09-26)

- 77a7ad0 v0.2.0
- 8a7a1ee docs: v0.2.0
- 28ee010 chore: update `ResolvedConfig`
- f6ea9c0 feat: examples/custom-start-electron-app
- cc8a30a feat(🌱): v0.2.0
- 2cdd3c8 refactor: cleanup

## 0.1.0 (2022-09-25)

- 340f988 v0.1.0
- 5a4fce4 `demo` -> `examples`
- dfd5c33 updat quick-start vite.config.ts
- cc80d05 feat(🌱): `configResolved()` `onwatch()` `transform()`
- fa3d287 chore: optimize
- bf63350 Merge branch 'main' of github.com:caoxiemeihao/vite-plugin-electron-unbuild into main
- e796014 Initial commit
- cb41f49 feat: demo/quick-start
- f6e5c4b feat(🌱): core code
- f5acd94 first commit
