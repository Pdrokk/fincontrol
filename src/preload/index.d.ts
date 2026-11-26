declare global {
  interface Window {
    electron: {
      process: {
        versions: {
          electron: string
          chrome: string
          node: string
        }
      }
    }
  }
}

export {}
