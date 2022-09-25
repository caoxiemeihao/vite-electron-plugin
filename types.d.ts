
declare namespace NodeJS {
  interface Process {
    _resolved_config: import('./src/config').ResolvedConfig
  }
}
