import path from 'node:path'
import {
  describe,
  expect,
  expectTypeOf,
  it,
} from 'vitest'
import { resolveConfig } from 'notbundle'
import {
  type ResolvedConfig,
  polyfillConfig,
} from '../src/config'

describe('src/config', async () => {
  it('polyfillConfig', async () => {
    const {
      root,
      outDir,
      api,
      plugins,
      experimental,
      // @ts-ignore
      output,
      transformOptions,
    } = await resolveConfig(polyfillConfig({ include: [] }) as any) as unknown as ResolvedConfig
    const dist_electron = path.posix.join(root, 'dist-electron')

    expect(outDir).eq(dist_electron)
    expect(output).eq(dist_electron)
    expect(api).toEqual({})
    expect(plugins[0].name).eq('electron:esbuild')
    expect(plugins[1].name).eq('electron:polyfill-config')
    expect(transformOptions).toEqual({ format: 'cjs', target: 'node14' })
    expectTypeOf(experimental.startup).toBeFunction()
    expectTypeOf(experimental.reload).toBeFunction()
  })
})
