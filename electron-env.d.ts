
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string
    VITE_DEV_SERVER_URL: string
  }

  interface Process {
    electronApp: import('child_process').ChildProcess
  }
}

interface ImportMeta {
  /** shims Vite */
  env: Record<string, any>
}
