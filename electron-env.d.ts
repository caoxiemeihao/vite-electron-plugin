
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string
    VITE_DEV_SERVER_URL: string
  }

  interface Process {
    electronApp?: import('node:child_process').ChildProcess
    _plugin_watcher?: import('notbundle').FSWatcher
  }
}

interface ImportMeta {
  /** shims Vite */
  env: Record<string, any>
}
