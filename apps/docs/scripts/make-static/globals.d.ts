declare global {
  interface Window {
    __relativeFilePrefix: string;
    __allowScriptElements: boolean;
    readfile: (path: string) => string;
  }
}

export {};
