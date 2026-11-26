declare global {
  interface Window {
    electron: {
      process: {
        sandboxed: boolean
        contextIsolated: boolean
        versions: { electron: string; chrome: string; node: string }
      }
    }
  }
}

export {}
